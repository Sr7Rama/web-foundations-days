# SnapShare System Scaling & Architecture Plan

## 1. Core Assumptions & Daily Active Users (DAU)

- **Total registered users:** 10,000,000 (10 million)
- **Daily active user rate:** 10% of registered users
- **Daily active users (DAU):** 10,000,000 × 0.10 = **1,000,000 (1 million DAU)**
- **Upload activity:** 1 photo per DAU per day
- **Feed views activity:** 50 feed page views per DAU per day
- **File sizes:** Original photo = 2 MB; generated thumbnail = 50 KB (0.05 MB)

## 2. Capacity & Scale Estimations

### A. Uploads per second

- **Total daily uploads:** 1,000,000 photos/day
- **Seconds per day:** 86,400
- **Average uploads/sec:** 1,000,000 / 86,400 ≈ **11.57 uploads/sec**
- **Peak uploads/sec (5× multiplier):** (1,000,000 / 86,400) × 5 ≈ **57.87 uploads/sec**

### B. Feed views per second

- **Total daily feed views:** 1,000,000 DAU × 50 = 50,000,000 views/day
- **Average feed views/sec:** 50,000,000 / 86,400 ≈ **578.7 views/sec**
- **Peak feed views/sec (5× multiplier):** (50,000,000 / 86,400) × 5 ≈ **2,893.5 views/sec**

### C. Storage per year

- **Combined storage per photo:** 2.0 MB + 0.05 MB = 2.05 MB
- **Daily storage needed:** 1,000,000 × 2.05 MB = 2,050,000 MB = 2,050 GB = **2.05 TB/day**
- **Annual storage needed:** 2.05 TB/day × 365 days ≈ **748.25 TB/year**

These estimates assume decimal storage units (1 TB = 1,000 GB) and do not include replication, backups, or other metadata. They also assume all generated thumbnails and originals are retained for the full year.

## 3. Read vs. Write System Characteristics

SnapShare is strongly **read-heavy**, with a read-to-write ratio of approximately 50:1 (50 feed views for each photo upload, based on the stated activity).

**Architectural impact:** Because reads vastly outnumber writes, the system should prioritize caching feed content and user metadata (for example, with Redis), use database read replicas to distribute query traffic, and rely on a content delivery network (CDN) to serve image assets from edge servers rather than application servers.

## 4. Storage Architecture Rationale

Binary photo files should not be stored inside a relational database. Storing large objects (BLOBs) can bloat database backups, degrade query performance, consume comparatively expensive database storage, and make horizontal scaling more difficult. Instead, store original and generated image files in object storage (for example, Amazon S3), and store image metadata in the database, such as object keys, upload timestamps, user IDs, and descriptions. Serve image files through a CDN.

## 5. Text-Based Architecture Diagram

```text
Mobile/Web Client
  |-- API requests --> Load Balancer --> Stateless API Servers
  |                                       |-- feed cache --> Redis
  |                                       |-- metadata writes --> Primary Database
  |                                       |                         `--> Read Replicas (feed reads)
  |                                       `-- thumbnail job --> Message Queue --> Thumbnail Workers
  |                                                                              |-- read original
  |                                                                              |-- write thumbnail
  |                                                                              `-- update metadata --> Primary Database
  |
  |<-- signed upload URL -- Stateless API Servers
  |-- direct upload using signed URL -------------------------------> Object Storage
  `-- image requests --> CDN -- cache miss -------------------------> Object Storage
```

The client obtains a short-lived signed upload URL from the API and uploads the original directly to object storage, avoiding routing large image payloads through API instances. After the upload is confirmed, the API records image metadata and enqueues thumbnail work; workers read the original, generate a thumbnail, store it in object storage, and update image metadata. Feed requests are served by stateless API instances, which can use Redis and database read replicas. The CDN serves cached images from the edge and retrieves uncached assets from object storage. The API enqueues work after confirming the upload; the queue does not depend on a separate object-storage event.

## 6. System Components Description

- **CDN (Content Delivery Network):** Caches image files at edge servers globally to reduce latency when users load photo feeds.
- **Load balancer:** Distributes incoming HTTP traffic across multiple application server instances to prevent individual servers from becoming bottlenecks.
- **App servers:** Execute core application logic, authenticate users, serve API requests, and coordinate database and storage operations.
- **In-memory cache (Redis):** Stores frequently accessed feed data, session data, and metadata in memory for fast retrieval.
- **Primary database:** Handles writes such as creating user profiles, inserting photo metadata, and recording likes and comments, while enforcing data integrity.
- **Read replicas:** Asynchronously replicate data from the primary database to serve read queries, such as feed fetching, and reduce read pressure on the primary.
- **Object storage (AWS S3):** Provides scalable, durable storage for binary media files, including original photos and thumbnails.
- **Message queue (RabbitMQ / SQS):** Decouples asynchronous background tasks from the request/response flow so image processing does not block user requests.
- **Worker servers:** Consume background jobs from the queue to generate thumbnails and save optimized images to object storage.

## 7. Step-by-Step Photo Upload Flow

1. **Request an upload URL:** The client sends the image metadata (such as caption and location) to the API through the load balancer. An app server requests a short-lived signed upload URL for the original image.
2. **Upload the original:** The client uploads the original photo (2 MB) directly to object storage using the signed URL, rather than sending the file through the app server.
3. **Create the metadata record:** Once the upload is confirmed, the app server inserts a photo record (for example, `user_id`, object key, `created_at`, and processing status) into the primary database.
4. **Enqueue thumbnail work:** The app server adds a thumbnail-generation job containing the photo ID and original object key to the message queue.
5. **Respond to the client:** The app server returns `201 Created` with the photo ID and an initial processing status. The response does not wait for thumbnail generation.
6. **Process the image:** A worker consumes the job, downloads the original from object storage, generates the 50 KB thumbnail, and saves it back to object storage.
7. **Update metadata and caches:** The worker updates the photo record with the thumbnail object key and completed processing status. Relevant feed caches in Redis can be invalidated or updated.

## 8. Architectural Trade-offs

### Trade-off 1: Asynchronous processing vs. immediate consistency

- **Choice:** Generate thumbnails asynchronously through a background queue instead of during the upload request.
- **Impact:** Upload responses are faster, but a user may open their feed immediately after uploading and see the photo before its thumbnail is ready. The client can display a placeholder or processing state until the worker finishes.

### Trade-off 2: Cache aggressiveness vs. memory costs

- **Choice:** Cache frequently accessed feed data in Redis for faster reads.
- **Impact:** This can substantially reduce database read load during traffic spikes, but requires sufficient RAM and careful cache invalidation. Caching entire feeds increases memory use and invalidation complexity, so the cache contents and expiration policy should be chosen based on measured access patterns.