# School Database System Design

## 1. Purpose and Scope

This database stores students, courses, and each student's enrolment in a
course. It uses SQLite and a normalized relational schema. The schema supports
the five operations in [school.sql](./school.sql): retrieving a student's
courses, listing students in a course, counting enrolments by course, finding
students without enrolments, and updating an enrolment grade.

## 2. Entity Schema

### `students`

Stores one row per student:

| Column | Definition | Purpose |
| --- | --- | --- |
| `student_id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique student identifier |
| `first_name` | `TEXT NOT NULL` | Student's first name |
| `last_name` | `TEXT NOT NULL` | Student's last name |
| `email` | `TEXT NOT NULL UNIQUE` | Required, unique contact address |

### `courses`

Stores one row per course:

| Column | Definition | Purpose |
| --- | --- | --- |
| `course_id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique course identifier |
| `course_name` | `TEXT NOT NULL` | Human-readable title |
| `course_code` | `TEXT NOT NULL UNIQUE` | Required, unique course code |

### `enrolments`

Stores one row for each student-course pairing:

| Column | Definition | Purpose |
| --- | --- | --- |
| `enrolment_id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique enrolment identifier |
| `student_id` | `INTEGER NOT NULL` | References the enrolled student |
| `course_id` | `INTEGER NOT NULL` | References the selected course |
| `grade` | `TEXT` | Optional grade for this student in this course |

The pair `(student_id, course_id)` has a `UNIQUE` constraint, so the same
student cannot be enrolled in the same course more than once. Both foreign
keys use `ON DELETE CASCADE`: deleting a student or course removes its related
enrolment rows. SQLite foreign-key enforcement is enabled in the script with
`PRAGMA foreign_keys = ON`.

## 3. Relationships

- One student can have zero or many enrolments.
- One course can have zero or many enrolments.
- Therefore, students and courses have a many-to-many relationship, resolved
  through `enrolments`.

The join table turns that many-to-many relationship into two one-to-many
relationships and stores data belonging to the association itself, such as a
grade. Student and course details remain in their respective tables rather
than being repeated for every enrolment. A student with no enrolments and a
course with no enrolments are both valid; the outer joins in the reporting
queries preserve those records.

## 4. Index Optimization

SQLite creates indexes to enforce primary-key and unique constraints. In
particular, the unique constraint on `(student_id, course_id)` creates a
composite index whose leading `student_id` supports enrolment lookups by
student, such as fetching a transcript or course list, and prevents duplicate
pairs. This means a separate
`CREATE INDEX idx_enrolments_student_id ON enrolments(student_id)` is
unnecessary for this schema: it would duplicate the leading portion of the
existing composite index, adding storage and write overhead without typically
improving those lookups. In database designs without that composite index, a
standalone `student_id` index can avoid scanning the enrolments table for
student-specific joins.

The primary keys support lookups of students and courses by their IDs; the
unique email and course-code constraints provide indexes for lookups by those
values.

The composite enrolment index does not efficiently serve lookups using only
`course_id`, because that column is second in the index. Add a reverse-order
index to support course-first joins, per-course counts, and efficient foreign
key checks when a course is deleted:

```sql
CREATE INDEX idx_enrolments_course_student
    ON enrolments (course_id, student_id);
```

If the database grows and the required queries frequently filter by course
name or student name, consider these additional indexes:

```sql
CREATE INDEX idx_courses_course_name
    ON courses (course_name);

CREATE INDEX idx_students_name
    ON students (first_name, last_name);
```

These indexes can help the exact-name filters used by the sample queries, but
they add storage and make inserts and updates slightly more expensive. Add
them based on measured query plans and workload; do not index `grade` unless
queries begin filtering or sorting by grade. Use `EXPLAIN QUERY PLAN` in
SQLite to verify whether an index benefits a particular query.

## 5. SQL vs. NoSQL Rationale

A relational SQL database is a good fit for this system because the core data
has clear entities and relationships, and the queries need to join students,
courses, and enrolments. SQL databases provide ACID transactions, which help
ensure that enrolment changes, grade updates, and registrations are applied
reliably as complete operations. Together with the enabled foreign-key
enforcement in the SQLite script, this prevents invalid references and
orphaned enrolment records. SQL also provides:

- Foreign-key enforcement to prevent enrolments referring to nonexistent
  students or courses.
- `NOT NULL`, `UNIQUE`, and primary-key constraints to protect data integrity.
- A normalized representation that avoids repeating student and course
  details across enrolment records.
- Joins and grouping for the required reports, plus transactions for related
  multi-step changes.

A NoSQL document database could store courses or enrolments in nested
documents, but representing both directions of the many-to-many relationship
may require duplicated data or multiple reads. Updates and deletions could
then need extra application logic to keep those copies consistent. NoSQL may
be a better choice if the system later prioritizes flexible, rapidly changing
records or globally distributed access patterns over relational joins and
database-enforced relationships. For the current structured school data and
query requirements, SQLite's relational model is simpler and more reliable.