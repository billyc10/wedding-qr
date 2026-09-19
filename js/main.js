const form = document.getElementById("lookup-form");
const nameInput = document.getElementById("guest-name");
const suggestionsEl = document.getElementById("suggestions");
const resultEl = document.getElementById("result");
const loadErrorEl = document.getElementById("load-error");
const submitBtn = form.querySelector(".btn");

let guests = [];
let matches = [];
let activeIndex = -1;

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseGuests(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const commaIndex = line.indexOf(",");
      if (commaIndex === -1) return null;

      const name = line.slice(0, commaIndex).trim();
      const table = line.slice(commaIndex + 1).trim();
      if (!name || !table) return null;

      return { name, table, normalized: normalizeName(name) };
    })
    .filter(Boolean);
}

function findGuest(query) {
  const normalized = normalizeName(query);
  return guests.find((guest) => guest.normalized === normalized);
}

function filterGuests(query) {
  const normalized = normalizeName(query);
  if (!normalized) return [];

  return guests.filter((guest) => guest.normalized.includes(normalized));
}

function showResult(type, html) {
  resultEl.hidden = false;
  resultEl.className = "result result--" + type;
  resultEl.innerHTML = html;
}

function showNotFound(name) {
  showResult(
    "not-found",
    `<p class="result-message">We couldn't find <strong>${escapeHtml(name)}</strong>. Please check the spelling and try your full name as shown on your invitation.</p>`
  );
}

function showFound(guest) {
  showResult(
    "found",
    `<p class="result-name">${escapeHtml(guest.name)}</p>
     <p class="result-table">${escapeHtml(guest.table)}</p>`
  );
  resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hideSuggestions() {
  matches = [];
  activeIndex = -1;
  suggestionsEl.hidden = true;
  suggestionsEl.innerHTML = "";
  nameInput.setAttribute("aria-expanded", "false");
  nameInput.removeAttribute("aria-activedescendant");
}

function renderSuggestions() {
  if (matches.length === 0) {
    hideSuggestions();
    return;
  }

  suggestionsEl.innerHTML = matches
    .map((guest, index) => {
      const activeClass = index === activeIndex ? " is-active" : "";
      return `<li role="none">
        <button
          type="button"
          class="suggestion${activeClass}"
          id="suggestion-${index}"
          role="option"
          aria-selected="${index === activeIndex}"
        >
          <span class="suggestion-name">${escapeHtml(guest.name)}</span>
          <span class="suggestion-table">${escapeHtml(guest.table)}</span>
        </button>
      </li>`;
    })
    .join("");

  suggestionsEl.hidden = false;
  nameInput.setAttribute("aria-expanded", "true");

  if (activeIndex >= 0) {
    nameInput.setAttribute("aria-activedescendant", `suggestion-${activeIndex}`);
  } else {
    nameInput.removeAttribute("aria-activedescendant");
  }
}

function updateSuggestions() {
  matches = filterGuests(nameInput.value);
  activeIndex = matches.length ? 0 : -1;
  renderSuggestions();
}

function selectGuest(guest) {
  nameInput.value = guest.name;
  hideSuggestions();
  showFound(guest);
}

function lookupName() {
  const query = nameInput.value.trim();
  if (!query || guests.length === 0) return;

  const guest = findGuest(query);
  if (guest) {
    showFound(guest);
  } else {
    showNotFound(query);
  }
}

async function loadGuests() {
  try {
    const response = await fetch("data/guests.txt");
    if (!response.ok) throw new Error("Failed to load guest list");

    const text = await response.text();
    guests = parseGuests(text);

    if (guests.length === 0) throw new Error("Guest list is empty");

    submitBtn.disabled = false;
  } catch {
    loadErrorEl.hidden = false;
    submitBtn.disabled = true;
  }
}

nameInput.addEventListener("input", updateSuggestions);

nameInput.addEventListener("focus", () => {
  if (normalizeName(nameInput.value)) updateSuggestions();
});

nameInput.addEventListener("keydown", (event) => {
  if (suggestionsEl.hidden) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeIndex = (activeIndex + 1) % matches.length;
    renderSuggestions();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    activeIndex = (activeIndex - 1 + matches.length) % matches.length;
    renderSuggestions();
  } else if (event.key === "Enter" && activeIndex >= 0) {
    event.preventDefault();
    selectGuest(matches[activeIndex]);
  } else if (event.key === "Escape") {
    hideSuggestions();
  }
});

suggestionsEl.addEventListener("mousedown", (event) => {
  const button = event.target.closest(".suggestion");
  if (!button) return;

  event.preventDefault();
  const index = Number(button.id.replace("suggestion-", ""));
  const guest = matches[index];
  if (guest) selectGuest(guest);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".combobox")) hideSuggestions();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  hideSuggestions();
  lookupName();
});

submitBtn.disabled = true;
loadGuests();
