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
  const lowerWord = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(lowerWord));
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
  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}

// 4. getSummary()
function getSummary() {
  const total = notes.length;
  const noteLabel = total === 1 ? "note" : "notes";
  const counts = countByCategory();

  const categoryParts = Object.entries(counts).map(
    ([category, count]) => `${count} ${category}`
  );

  return `${total} ${noteLabel}: ${categoryParts.join(", ")}.`;
}

// 5. isDuplicate(text)
function isDuplicate(text) {
  const normalizedInput = text.trim().toLowerCase();
  return notes.some(
    (note) => note.text.trim().toLowerCase() === normalizedInput
  );
}

// 6. addNote(text, category)
function addNote(text, category) {
  const trimmedText = text ? text.trim() : "";
  const validCategories = ["personal", "work", "study"];

  if (trimmedText.length < 1 || trimmedText.length > 200) {
    console.log("Failed to add note: Text must be between 1 and 200 characters.");
    return false;
  }

  if (!validCategories.includes(category)) {
    console.log(`Failed to add note: Invalid category "${category}".`);
    return false;
  }

  if (isDuplicate(trimmedText)) {
    console.log(`Failed to add note: Duplicate note text "${trimmedText}".`);
    return false;
  }

  const newId = notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
  notes.push({ id: newId, text: trimmedText, category: category });
  return true;
}

// ==========================================
// TESTING & CONSOLE OUTPUTS
// ==========================================

console.log("--- Testing searchNotes ---");
console.log(searchNotes("report"));
// Expected: [{ id: 3, text: "Email the project report to Grace", category: "work" }]
console.log(searchNotes("python"));
// Expected: []

console.log("\n--- Testing longestNote ---");
console.log(longestNote());
// Expected: { id: 3, text: "Email the project report to Grace", category: "work" }
// Edge case: longestNote returns null when there are no notes.
const originalNotes = [...notes];
notes = [];
console.log(longestNote());
// Expected: null
notes = originalNotes; // Restore original array

console.log("\n--- Testing countByCategory ---");
console.log(countByCategory());
// Expected: { personal: 2, study: 2, work: 1 }

console.log("\n--- Testing getSummary ---");
console.log(getSummary());
// Expected: "5 notes: 2 personal, 2 study, 1 work."

console.log("\n--- Testing isDuplicate ---");
console.log(isDuplicate("  call mum  "));
// Expected: true
console.log(isDuplicate("Buy groceries"));
// Expected: false

console.log("\n--- Testing addNote ---");
console.log(addNote("Prepare presentation", "work"));
// Expected: true
console.log(addNote("Call mum", "personal"));
// Expected output: Failed to add note: Duplicate note text "Call mum". Then false.
console.log(addNote("", "work"));
// Expected output: Failed to add note: Text must be between 1 and 200 characters. Then false.
console.log(addNote("Valid note text", "fitness"));
// Expected output: Failed to add note: Invalid category "fitness". Then false.