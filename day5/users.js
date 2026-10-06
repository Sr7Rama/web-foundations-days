// DOM Element Selections
const loadBtn = document.getElementById("load-users");
const filterInput = document.getElementById("filter-input");
const statusP = document.getElementById("status");
const usersList = document.getElementById("users-list");

// Memory cache for users list
let allUsers = [];

// Render users safely using DOM methods
function renderUsers(users) {
  usersList.textContent = "";

  if (users.length === 0) {
    const noMatchLi = document.createElement("li");
    noMatchLi.textContent = "No users match your filter.";
    usersList.appendChild(noMatchLi);
    return;
  }

  users.forEach((user) => {
    const li = document.createElement("li");

    const nameHeading = document.createElement("strong");
    nameHeading.textContent = user.name;

    const detailsP = document.createElement("p");
    detailsP.textContent = `Email: ${user.email} | City: ${user.address?.city || "N/A"} | Company: ${user.company?.name || "N/A"}`;

    li.appendChild(nameHeading);
    li.appendChild(detailsP);
    usersList.appendChild(li);
  });
}

async function loadUsers() {
  loadBtn.disabled = true;
  statusP.textContent = "Loading users...";
  usersList.textContent = "";

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    allUsers = await response.json();
    statusP.textContent = `Successfully loaded ${allUsers.length} users.`;
    renderUsers(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    statusP.textContent = "Failed to load users. Please try again later.";
  } finally {
    loadBtn.disabled = false;
  }
}

filterInput.addEventListener("input", () => {
  const searchTerm = filterInput.value.trim().toLowerCase();
  const filteredUsers = allUsers.filter((user) =>
    user.name.toLowerCase().includes(searchTerm)
  );
  renderUsers(filteredUsers);
});

loadBtn.addEventListener("click", loadUsers);