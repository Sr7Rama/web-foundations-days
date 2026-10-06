# Library Books REST API Design

## Resource: `/api/books`

A book has an ID, title, author, ISBN, publication year, and genre. ISBNs are
unique. IDs are assigned by the API.

### Endpoints

#### 1. List books

`GET /api/books`

Retrieve all books in the library. An optional `author` query parameter filters
the results by author name.

- `200 OK` — returns an array of books (an empty array if there are no books).
- `500 Internal Server Error` — the server could not complete the request.

Example filtered request: `GET /api/books?author=F.%20Scott%20Fitzgerald`

Example response:

```json
[
  {
    "id": 1,
    "title": "The Hobbit",
    "author": "J.R.R. Tolkien",
    "isbn": "9780547928227",
    "publishedYear": 1937,
    "genre": "Fantasy"
  }
]
```

#### 2. Get a book

`GET /api/books/:id`

Retrieve one book by its ID.

- `200 OK` — returns the book.
- `400 Bad Request` — the ID is invalid.
- `404 Not Found` — no book exists with that ID.
- `500 Internal Server Error` — the server could not complete the request.

#### 3. Create a book

`POST /api/books`

Add a book to the library. The API assigns the new book's ID.

- `201 Created` — returns the created book.
- `400 Bad Request` — the request body is malformed or has missing/invalid fields.
- `409 Conflict` — the ISBN is already assigned to another book.
- `500 Internal Server Error` — the server could not complete the request.

Example request body:

```json
{
  "title": "The Hobbit",
  "author": "J.R.R. Tolkien",
  "isbn": "9780547928227",
  "publishedYear": 1937,
  "genre": "Fantasy"
}
```

#### 4. Replace a book

`PUT /api/books/:id`

Update an existing book's complete details by ID. All fields shown in the
request body are required.

- `200 OK` — returns the updated book.
- `400 Bad Request` — the ID is invalid or the request body is malformed or invalid.
- `404 Not Found` — no book exists with that ID.
- `409 Conflict` — the ISBN is already assigned to another book.
- `500 Internal Server Error` — the server could not complete the request.

Example request body:

```json
{
  "title": "The Great Gatsby (Special Edition)",
  "author": "F. Scott Fitzgerald",
  "isbn": "9780743273565",
  "publishedYear": 1925
}
```

#### 5. Update a book

`PATCH /api/books/:id`

Update one or more editable fields. Omitted fields remain unchanged. At least
one editable field must be provided.

- `200 OK` — returns the updated book.
- `400 Bad Request` — the ID is invalid or the request body is malformed or invalid.
- `404 Not Found` — no book exists with that ID.
- `409 Conflict` — the ISBN is already assigned to another book.
- `500 Internal Server Error` — the server could not complete the request.

Example request body:

```json
{
  "genre": "Children's fantasy"
}
```

#### 6. Delete a book

`DELETE /api/books/:id`

Remove a book from the library catalog by ID.

- `200 OK` — the book was deleted; may return a confirmation or the deleted book.
- `204 No Content` — the book was deleted; the response has no body.
- `400 Bad Request` — the ID is invalid.
- `404 Not Found` — no book exists with that ID.
- `500 Internal Server Error` — the server could not complete the request.

## Error responses

`400 Bad Request` is returned when the request payload is malformed or is
missing required fields during creation or update. For example, a
`POST /api/books` request without a required `title` returns this status.

`404 Not Found` is returned when requesting, updating, or deleting a book that
does not exist. For example, `GET /api/books/999` returns this status if book
ID 999 is not in the catalog.

Errors use a consistent JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The title field is required."
  }
}
```

| HTTP status | Error code | Meaning |
| --- | --- | --- |
| `400 Bad Request` | `INVALID_ID` | The supplied book ID is not valid. |
| `400 Bad Request` | `INVALID_JSON` | The request body is not valid JSON. |
| `400 Bad Request` | `VALIDATION_ERROR` | A required field is missing or a field value is invalid. |
| `404 Not Found` | `BOOK_NOT_FOUND` | No book exists with the supplied ID. |
| `409 Conflict` | `ISBN_ALREADY_EXISTS` | The ISBN is already used by another book. |
| `500 Internal Server Error` | `INTERNAL_SERVER_ERROR` | An unexpected server error prevented the request from completing. |