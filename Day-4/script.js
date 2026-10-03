// Select DOM Elements
const noteTextarea = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggleBtn = document.getElementById("theme-toggle");

// Update Counts & Counter Styling
function updateCounts() {
  const text = noteTextarea.value;
  const charLength = text.length;

  // Calculate words (ignore multiple/empty whitespace strings)
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  // Update text displays
  charCount.textContent = `${charLength} / 200 characters`;
  wordCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;

  // Reset and apply warning/over classes
  charCount.classList.remove("warning", "over");
  if (charLength > 200) {
    charCount.classList.add("over");
  } else if (charLength > 180) {
    charCount.classList.add("warning");
  }
}

// Save Draft to localStorage
function saveDraft() {
  localStorage.setItem("quicknotes_draft", noteTextarea.value);
}

// Clear Draft and Reset UI
function clearAll() {
  noteTextarea.value = "";
  localStorage.removeItem("quicknotes_draft");
  updateCounts();
}

// Theme Management
function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.add("dark");
    themeToggleBtn.textContent = "Light mode";
  } else {
    document.body.classList.remove("dark");
    themeToggleBtn.textContent = "Dark mode";
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  themeToggleBtn.textContent = isDark ? "Light mode" : "Dark mode";
  localStorage.setItem("quicknotes_theme", isDark ? "dark" : "light");
}

// Restore Saved State on Page Load
function restoreState() {
  // Restore Theme
  const savedTheme = localStorage.getItem("quicknotes_theme");
  applyTheme(savedTheme === "dark");

  // Restore Draft Text
  const savedDraft = localStorage.getItem("quicknotes_draft");
  if (savedDraft !== null) {
    noteTextarea.value = savedDraft;
  }

  // Update counts based on restored text
  updateCounts();
}

// Event Listeners
noteTextarea.addEventListener("input", () => {
  updateCounts();
  saveDraft();
});

noteTextarea.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    clearAll();
  }
});

clearBtn.addEventListener("click", clearAll);
themeToggleBtn.addEventListener("click", toggleTheme);

// Initialize application state
restoreState();