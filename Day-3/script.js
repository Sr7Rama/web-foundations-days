// Starting Data
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

// 1. searchNotes(word)
function searchNotes(word) {
  const query = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(query));
}

// 2. longestNote()
function longestNote() {
  if (notes.length === 0) return null;
  return notes.reduce((longest, current) =>
    current.text.length > longest.text.length ? current : longest
  );
}

// 3. countByCategory()
function countByCategory() {
  const counts = {};
  notes.forEach((note) => {
    counts[note.category] = (counts[note.category] || 0) + 1;
  });
  return counts;
}

// 4. getSummary()
function getSummary() {
  const total = notes.length;
  const counts = countByCategory();
  const word = total === 1 ? "note" : "notes";

  const categoriesString = Object.entries(counts)
    .map(([cat, count]) => `${count} ${cat}`)
    .join(", ");

  return `${total} ${word}: ${categoriesString}.`;
}

// 5. isDuplicate(text)
function isDuplicate(text) {
  const cleanText = text.trim().toLowerCase();
  return notes.some((note) => note.text.trim().toLowerCase() === cleanText);
}

// 6. addNote(text, category)
function addNote(text, category) {
  const trimmedText = text ? text.trim() : "";
  const validCategories = ["personal", "work", "study"];

  // Check length constraints (1–200 chars)
  if (trimmedText.length < 1 || trimmedText.length > 200) {
    console.log("Failed to add note: Text must be between 1 and 200 characters.");
    return false;
  }

  // Check valid category
  if (!validCategories.includes(category)) {
    console.log(`Failed to add note: Invalid category '${category}'. Must be personal, work, or study.`);
    return false;
  }

  // Check for duplicate text
  if (isDuplicate(trimmedText)) {
    console.log("Failed to add note: A duplicate note already exists.");
    return false;
  }

  // Add new note object
  const newId = notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
  notes.push({ id: newId, text: trimmedText, category: category });
  return true;
}

// ==========================================
// TESTING & CONSOLE OUTPUTS
// ==========================================

console.log("--- 1. searchNotes ---");
console.log(searchNotes("report"));
// Expected Output: [{ id: 3, text: "Email the project report to Grace", category: "work" }]

console.log(searchNotes("python"));
// Expected Output: []

console.log("\n--- 2. longestNote ---");
console.log(longestNote());
// Expected Output: { id: 3, text: "Email the project report to Grace", category: "work" }

// Edge case test for longestNote with empty notes array
const tempNotes = notes;
notes = [];
console.log(longestNote());
// Expected Output: null
notes = tempNotes; // Restore notes array

console.log("\n--- 3. countByCategory ---");
console.log(countByCategory());
// Expected Output: { personal: 2, study: 2, work: 1 }

notes.push({ id: 6, text: "New task", category: "urgent" });
console.log(countByCategory());
// Expected Output: { personal: 2, study: 2, work: 1, urgent: 1 }
notes.pop(); // Revert temporary addition

console.log("\n--- 4. getSummary ---");
console.log(getSummary());
// Expected Output: "5 notes: 2 personal, 2 study, 1 work."

// Singular test case
notes = [{ id: 1, text: "Single note", category: "personal" }];
console.log(getSummary());
// Expected Output: "1 note: 1 personal."
notes = tempNotes; // Restore original array

console.log("\n--- 5. isDuplicate ---");
console.log(isDuplicate("  call MUM "));
// Expected Output: true

console.log(isDuplicate("Buy groceries"));
// Expected Output: false

console.log("\n--- 6. addNote ---");
console.log(addNote("Organize desk", "personal"));
// Expected Output: true

console.log(addNote("Call mum", "personal"));
// Log: Failed to add note: A duplicate note already exists.
// Expected Output: false

console.log(addNote("Read chapter 1", "hobby"));
// Log: Failed to add note: Invalid category 'hobby'. Must be personal, work, or study.
// Expected Output: false

console.log(addNote("", "work"));
// Log: Failed to add note: Text must be between 1 and 200 characters.
// Expected Output: false