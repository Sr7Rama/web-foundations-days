# TicketHub System Design Document

## 1. Requirements

### Functional Requirements
* Users can browse upcoming events and view interactive seat maps.
* Users can temporarily hold an available seat for 10 minutes while completing payment.
* Users can process payments and generate e-tickets with unique QR codes.
* Users can view their purchased tickets in their account dashboard.

### Non-Functional Requirements
* **Strict Correctness (Zero Double-Booking):** Under no circumstances may two users purchase or hold the same physical seat.
* **High Availability & Scalability:** System must handle sudden 100x traffic surges during high-demand concert drops.
* **Low Latency:** Browsing events and seat availability must respond in <200ms.
* **Fairness:** Rate limiting and queueing must prevent automated scripts/bots from buying out tickets instantaneously.

---

## 2. Load & Capacity Estimations

### Baseline / Normal Day Traffic
* **Daily Active Visitors:** 50,000 visitors/day
* **Normal Page Views:** $50,000 \times 10 = 500,000 \text{ views/day}$
* **Average Read Traffic:** $500,000 / 86,400 \approx 5.78 \text{ requests/sec}$
* **Normal Ticket Sales:** 5,000 tickets/day ($\approx 0.058 \text{ sales/sec}$)

### Popular Concert "Big Sale" Burst Peak Traffic
* **Peak Visitors:** 200,000 users competing within a 10-minute (600-second) window.
* **Peak Request Volume:** Assuming each user generates 20 API requests (browsing, refreshing, attempting seat holds) during the drop:
  $$\text{Total Requests} = 200,000 \times 20 = 4,000,000 \text{ requests}$$
* **Peak Read/Write RPS:** $4,000,000 / 600 \text{ seconds} \approx 6,666.7 \text{ requests/sec}$ (A ~1,150x traffic spike over normal baseline traffic).
* **Ticket Exhaustion Rate:** 20,000 seats sold out in 600 seconds ($\approx 33.3 \text{ successful checkouts/sec}$).

---

## 3. REST API Specification

* **`GET /api/v1/events`**
  * *Description:* List published events (supports filtering and pagination).
  * *Status:* `200 OK`
* **`GET /api/v1/events/:id/seats`**
  * *Description:* Fetch real-time seat availability map for an event.
  * *Status:* `200 OK`
* **`POST /api/v1/seats/hold`**
  * *Description:* Temporarily reserve a seat for 10 minutes.
  * *Request Body:* `{ "eventId": 10, "seatId": 450, "userId": 88 }`
  * *Status:* `201 Created` (or `409 Conflict` if seat is already held/sold)
* **`POST /api/v1/orders/checkout`**
  * *Description:* Process payment for a held seat and finalize the order.
  * *Request Body:* `{ "holdId": "h_9921", "paymentToken": "tok_visa" }`
  * *Status:* `200 OK`
* **`GET /api/v1/tickets/my-tickets`**
  * *Description:* Retrieve all purchased e-tickets for the authenticated user.
  * *Status:* `200 OK`

---

## 4. Database Data Model

### Tables Schema (DDL)

```sql
CREATE TABLE users (
user_id INTEGER PRIMARY KEY AUTOINCREMENT,
full_name VARCHAR(100) NOT NULL,
email VARCHAR(255) NOT NULL UNIQUE,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(150) NOT NULL,
    venue VARCHAR(150) NOT NULL,
    event_date TIMESTAMP NOT NULL
);

CREATE TABLE seats (
    seat_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    seat_number VARCHAR(20) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'HELD', 'SOLD'
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    UNIQUE(event_id, seat_number)
);

CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    seat_id INTEGER NOT NULL UNIQUE, -- Ensures 1 seat maps to 1 finalized order max
    amount_paid DECIMAL(10, 2) NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (seat_id) REFERENCES seats(seat_id)
);
```

---

## 5. Prevention of Double-Booking

Double-booking is prevented using **atomic database transactions with pessimistic row-level locking (`SELECT ... FOR UPDATE`) and short-lived Redis key locks**.

1. When a user requests a hold on `seat_id = 450`, the backend initiates a transaction:

   ```sql
   BEGIN TRANSACTION;

   SELECT status
   FROM seats
   WHERE seat_id = 450 AND status = 'AVAILABLE'
   FOR UPDATE;
   ```

2. If the row returns `AVAILABLE`, the server executes:

   ```sql
   UPDATE seats
   SET status = 'HELD'
   WHERE seat_id = 450;

   COMMIT;
   ```

3. The database places an exclusive row lock during step 1. Any concurrent request attempting to hold seat 450 is blocked until the first transaction commits. Subsequent requests see status `HELD` and immediately fail with `409 Conflict`.
4. A Redis key with a **10-minute Time-To-Live (TTL)** is created (`hold:seat:450`). If payment is not completed within 10 minutes, a Redis expiration trigger automatically resets the database `status` back to `AVAILABLE`.

---

## 6. System Architecture Diagram & Components

```text
[ 200,000 Burst Users ]
          |
          v
[ Cloudflare CDN & Rate Limiter / Bot Protection ]
          |
          v
[ Virtual Waiting Room (Queue) ]
          |
          v
[ Nginx Load Balancers ]
          |
     +----+----+
     v         v
[ App Server 1 ] [ App Server 2 ]
     |         |
     +----+----+----------------+
          |                     |
          v                     v
 [ Redis Cluster ]       [ Primary DB ]       [ Message Queue ]
 (Seat Holds &            (Transact SQL)             |
  Cache Maps)                                        v
                                              [ Worker Servers ]
                                              (Email & QR Generator)
```

### Component Explanations
* **Cloudflare CDN & Bot Protection:** Filters out automated scalper bots and buffers static assets.
* **Virtual Waiting Room:** Throttles incoming surge traffic into a managed queue, admitting only as many users per minute as app servers can process.
* **Load Balancer:** Distributes API requests evenly across healthy application servers.
* **App Servers:** Executes reservation logic, transaction boundaries, and payment integration.
* **Redis Cluster:** Manages in-memory seat map availability caches and high-speed temporary seat hold timers.
* **Primary Relational Database:** Enforces ACID compliance, foreign key constraints, and transactional row-level locks for final sales.
* **Message Queue & Workers:** Asynchronously processes non-critical tasks like generating PDF tickets and sending email confirmations without delaying HTTP response cycles.

---

## 7. Trade-offs

* **Trade-off 1: Virtual Waiting Room vs. Instant Access**
  * *Choice:* Forcing high-demand visitors into a virtual queue during ticket drops.
  * *Impact:* Users must wait in a queue instead of accessing the site instantly, but it preserves system stability and prevents server crashes under 6,600+ RPS surges.

* **Trade-off 2: Pessimistic Row Locking vs. Throughput**
  * *Choice:* Using `FOR UPDATE` row locks during seat reservation transactions.
  * *Impact:* Reduces maximum concurrent database write throughput slightly, but guarantees 100% data correctness with zero double-booked seats.