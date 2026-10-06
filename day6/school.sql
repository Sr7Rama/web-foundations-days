PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. CREATE TABLES
-- ==========================================

CREATE TABLE students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_name TEXT NOT NULL,
    course_code TEXT NOT NULL UNIQUE
);

-- Join table for the many-to-many relationship between students and courses.
CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    UNIQUE (student_id, course_id)
);

-- ==========================================
-- 2. INSERT SAMPLE DATA
-- ==========================================

INSERT INTO students (first_name, last_name, email) VALUES
    ('Alice', 'Smith', 'alice.smith@example.com'),
    ('Bob', 'Jones', 'bob.jones@example.com'),
    ('Charlie', 'Brown', 'charlie.brown@example.com'),
    ('Diana', 'Prince', 'diana.prince@example.com');

INSERT INTO courses (course_name, course_code) VALUES
    ('Web Foundations', 'CS101'),
    ('Database Design', 'CS102'),
    ('JavaScript Mastery', 'CS103');

INSERT INTO enrolments (student_id, course_id, grade) VALUES
    (1, 1, 'A'),
    (1, 2, 'B'),
    (2, 1, 'B+'),
    (2, 3, 'A-'),
    (3, 1, 'C');
-- Diana (student_id 4) intentionally has no enrolments.

-- ==========================================
-- 3. FIVE REQUIRED QUERIES
-- ==========================================

-- Query 1: All courses for Alice Smith.
SELECT c.course_code, c.course_name, e.grade
FROM courses AS c
JOIN enrolments AS e ON c.course_id = e.course_id
JOIN students AS s ON e.student_id = s.student_id
WHERE s.first_name = 'Alice'
  AND s.last_name = 'Smith';

-- Query 2: All students enrolled in Web Foundations.
SELECT s.student_id, s.first_name, s.last_name, s.email, e.grade
FROM students AS s
JOIN enrolments AS e ON s.student_id = e.student_id
JOIN courses AS c ON e.course_id = c.course_id
WHERE c.course_name = 'Web Foundations';

-- Query 3: Number of students enrolled in each course, including courses
-- with no enrolments.
SELECT c.course_name, COUNT(e.student_id) AS student_count
FROM courses AS c
LEFT JOIN enrolments AS e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_name;

-- Query 4: Students who have no enrolments.
SELECT s.student_id, s.first_name, s.last_name, s.email
FROM students AS s
LEFT JOIN enrolments AS e ON s.student_id = e.student_id
WHERE e.enrolment_id IS NULL;

-- Query 5: Update Charlie Brown's CS101 grade to B.
UPDATE enrolments
SET grade = 'B'
WHERE student_id = 3
  AND course_id = 1;