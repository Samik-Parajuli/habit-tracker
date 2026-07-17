/* ===================================================================== */
/* === ELEMENT HOOKS === */
/* ===================================================================== */
const habitTable = document.getElementById("habitTable");
const habitBody = document.getElementById("habitBody");
const addHabitBtn = document.getElementById("addHabitBtn");
const monthInput = document.getElementById("monthInput");
const userName = document.getElementById("userName");
const canvas = document.getElementById("scoreGraph");
const streakCount = document.getElementById("streakCount");
const bestStreak = document.getElementById("bestStreak");
const themeBtn = document.getElementById("themeToggle");
const dailySummary = document.getElementById("dailySummary");
const resetMonthBtn = document.getElementById("resetMonth");
const resetAllBtn = document.getElementById("resetAll");

const today = new Date();
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

let selectedMonth = localStorage.getItem("selectedMonth") || currentMonth;
let habits = [];

/* ===================================================================== */
/* === INIT === */
/* ===================================================================== */
monthInput.value = selectedMonth;

/* --------------------------------------------------------------------- */
/* Theme Management – black & white only */
(function initTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.body.classList.add(saved === "dark" ? "dark-mode" : "light-mode");
})();

if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    document.body.classList.toggle("light-mode");
    const mode = document.body.classList.contains("dark-mode") ? "dark" : "light";
    localStorage.setItem("theme", mode);
  });
}

/* ===================================================================== */
/* === STORAGE HELPERS === */
/* ===================================================================== */
function storageKey() {
  return `monthly-habit-tracker-${selectedMonth}`;
}

function daysInSelectedMonth() {
  const [year, month] = selectedMonth.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function createEmptyHabits() {
  const days = daysInSelectedMonth();
  return Array.from({ length: 10 }, (_, i) => ({
    name: `${i + 1}.`,
    completed: Array(days).fill(false),
  }));
}

function loadData() {
  const savedData = JSON.parse(localStorage.getItem(storageKey()));

  if (savedData) {
    habits = savedData.habits || [];
    userName.value = savedData.name || "";
  } else {
    habits = createEmptyHabits();
    userName.value = localStorage.getItem("trackerName") || "";
  }

  renderTable();
  updateGraphAndStreaks();
}

function saveData() {
  localStorage.setItem(
    storageKey(),
    JSON.stringify({ name: userName.value, habits })
  );
  localStorage.setItem("selectedMonth", selectedMonth);
  localStorage.setItem("trackerName", userName.value);

  const now = new Date().toLocaleString();
  const footer = document.getElementById("lastUpdatedTime");
  if (footer) footer.textContent = `Last updated: ${now}`;
}

/* ===================================================================== */
/* === TABLE RENDERING === */
/* ===================================================================== */
function renderTable() {
  const days = daysInSelectedMonth();
  const headerRow = habitTable.querySelector("thead tr");
  headerRow.innerHTML = `<th class="habit-col">HABITS/PROTOCOLS</th>`;

  for (let d = 1; d <= days; d++) {
    const th = document.createElement("th");
    th.textContent = d;
    headerRow.appendChild(th);
  }

  habitBody.innerHTML = "";

  habits.forEach((habit, index) => {
    const row = document.createElement("tr");

    // Habit name cell
    const nameCell = document.createElement("td");
    nameCell.className = "habit-name";

    const input = document.createElement("input");
    input.type = "text";
    input.value = habit.name;
    input.placeholder = "Habit name";
    input.setAttribute("aria-label", `Habit ${index + 1}`);

    input.addEventListener("input", () => {
      habits[index].name = input.value;
      saveData();
    });

    nameCell.appendChild(input);
    row.appendChild(nameCell);

    // Daily checkboxes
    for (let day = 0; day < days; day++) {
      const cell = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!habit.completed[day];
      checkbox.setAttribute(
        "aria-label",
        `${habit.name || `Habit ${index + 1}`} — day ${day + 1}`
      );

      checkbox.addEventListener("change", () => {
        habits[index].completed[day] = checkbox.checked;
        saveData();
        updateGraphAndStreaks();
      });

      cell.appendChild(checkbox);
      row.appendChild(cell);
    }

    habitBody.appendChild(row);
  });
}

/* ===================================================================== */
/* === CALCULATIONS === */
/* ===================================================================== */
function getDailyScores() {
  const days = daysInSelectedMonth();
  return Array.from({ length: days }, (_, i) =>
    habits.reduce((total, habit) => total + (habit.completed[i] ? 1 : 0), 0)
  );
}

function calculateStreaks(scores) {
  const completed = scores.map(s => s > 0);

  let current = 0;
  for (let i = completed.length - 1; i >= 0; i--) {
    if (!completed[i]) break;
    current++;
  }

  let best = 0, run = 0;
  for (const done of completed) {
    if (done) {
      run++;
      best = Math.max(best, run);
    } else run = 0;
  }

  return { current, best };
}

/* ===================================================================== */
/* === GRAPH, STREAKS & SUMMARY === */
/* ===================================================================== */
function updateGraphAndStreaks() {
  const scores = getDailyScores();
  const { current, best } = calculateStreaks(scores);

  const newCurrent = `${current} day${current === 1 ? "" : "s"}`;
  const newBest = `${best} day${best === 1 ? "" : "s"}`;

  if (streakCount.textContent !== newCurrent) {
    streakCount.textContent = newCurrent;
    pulse(streakCount);
  }

  if (bestStreak.textContent !== newBest) {
    bestStreak.textContent = newBest;
    pulse(bestStreak);
  }

  drawGraph(scores);

  const avgCompletion = Math.round(
    (scores.reduce((a, b) => a + b, 0) / (scores.length * habits.length || 1)) * 100
  );

  if (dailySummary) {
    dailySummary.textContent = `Monthly completion: ${avgCompletion || 0}%`;
  }
}

function drawGraph(scores) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(rect.width, 300);
  const height = 250;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const pad = { top: 25, right: 20, bottom: 35, left: 35 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const maxScore = Math.max(habits.length, 1);
  const xStep = scores.length > 1 ? w / (scores.length - 1) : w;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("background");
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1;
  ctx.font = "11px Arial";
  ctx.fillStyle = "#555";
  ctx.textAlign = "right";

  for (let value = 0; value <= maxScore; value++) {
    const y = pad.top + h - (value / maxScore) * h;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(value, pad.left - 8, y + 4);
  }

  // Axes
  ctx.strokeStyle = "#000";
  if (document.body.classList.contains("dark-mode")) ctx.strokeStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, height - pad.bottom);
  ctx.lineTo(width - pad.right, height - pad.bottom);
  ctx.stroke();

  // Line
  ctx.strokeStyle = document.body.classList.contains("dark-mode") ? "#fff" : "#000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  scores.forEach((s, i) => {
    const x = pad.left + i * xStep;
    const y = pad.top + h - (s / maxScore) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dots + labels
  scores.forEach((s, i) => {
    const x = pad.left + i * xStep;
    const y = pad.top + h - (s / maxScore) * h;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    if (scores.length <= 15 || i === 0 || i === scores.length - 1 || (i + 1) % 5 === 0) {
      ctx.fillText(i + 1, x, height - 12);
    }
  });
}

/* ===================================================================== */
/* === ANIMATIONS === */
/* ===================================================================== */
function pulse(el) {
  el.classList.remove("streak-updated");
  void el.offsetWidth; // restart animation
  el.classList.add("streak-updated");
}

/* ===================================================================== */
/* === EVENT LISTENERS === */
/* ===================================================================== */
addHabitBtn.addEventListener("click", () => {
  const newHabitNumber = habits.length + 1;
  habits.push({
    name: `${newHabitNumber}.`,
    completed: Array(daysInSelectedMonth()).fill(false),
  });
  saveData();
  renderTable();
  updateGraphAndStreaks();

  const rows = habitBody.querySelectorAll("tr");
  const lastRow = rows[rows.length - 1];
  if (lastRow) lastRow.classList.add("new-row");
});

monthInput.addEventListener("change", () => {
  if (!monthInput.value) return;
  selectedMonth = monthInput.value;
  localStorage.setItem("selectedMonth", selectedMonth);
  loadData();
});

userName.addEventListener("input", saveData);

window.addEventListener("resize", updateGraphAndStreaks);

/* ==== RESET BUTTONS ==== */
// Reset this month only
resetMonthBtn?.addEventListener("click", () => {
  if (!confirm("Reset this month? All current data will be cleared.")) return;
  localStorage.removeItem(storageKey());
  habits = createEmptyHabits();
  saveData();
  renderTable();
  updateGraphAndStreaks();
  document.querySelector(".container").style.animation = "fadeSlideIn 0.4s ease";
  setTimeout(() => (document.querySelector(".container").style.animation = ""), 400);
});

// Reset all months entirely
resetAllBtn?.addEventListener("click", () => {
  if (!confirm("This will delete all months and preferences. Continue?")) return;
  localStorage.clear();
  selectedMonth = currentMonth;
  habits = createEmptyHabits();
  userName.value = "";
  document.body.classList.remove("dark-mode");
  document.body.classList.add("light-mode");
  renderTable();
  updateGraphAndStreaks();
});

/* ===================================================================== */
/* === INITIAL LOAD CALL === */
/* ===================================================================== */
loadData();
function drawGraph(scores) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(rect.width, 300);
  const height = 250;
  const dpr = window.devicePixelRatio || 1;

  const isDark = document.body.classList.contains("dark-mode");

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const pad = { top: 25, right: 20, bottom: 35, left: 35 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const maxScore = Math.max(habits.length, 1);
  const xStep = scores.length > 1 ? w / (scores.length - 1) : w;

  // --- Background ---
  ctx.fillStyle = isDark ? "#000" : "#fff";
  ctx.fillRect(0, 0, width, height);

  // --- Grid ---
  ctx.strokeStyle = isDark ? "#333" : "#ddd";
  ctx.lineWidth = 1;
  ctx.font = "11px Arial";
  ctx.fillStyle = isDark ? "#aaa" : "#555";
  ctx.textAlign = "right";

  for (let value = 0; value <= maxScore; value++) {
    const y = pad.top + h - (value / maxScore) * h;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(value, pad.left - 8, y + 4);
  }

  // --- Axes ---
  ctx.strokeStyle = isDark ? "#fff" : "#000";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, height - pad.bottom);
  ctx.lineTo(width - pad.right, height - pad.bottom);
  ctx.stroke();

  if (!scores.length) return;

  // --- Data line ---
  ctx.strokeStyle = isDark ? "#fff" : "#000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  scores.forEach((s, i) => {
    const x = pad.left + i * xStep;
    const y = pad.top + h - (s / maxScore) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // --- Dots + Day labels ---
  scores.forEach((s, i) => {
    const x = pad.left + i * xStep;
    const y = pad.top + h - (s / maxScore) * h;

    ctx.fillStyle = isDark ? "#fff" : "#000";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    if (scores.length <= 15 || i === 0 || i === scores.length - 1 || (i + 1) % 5 === 0) {
      ctx.fillStyle = isDark ? "#aaa" : "#555";
      ctx.textAlign = "center";
      ctx.fillText(i + 1, x, height - 12);
    }
  });
}
/* ===================================================================== */
/* === DAILY GOALS MODULE === */
/* ===================================================================== */
const goalInput = document.getElementById("goalInput");
const addGoalBtn = document.getElementById("addGoalBtn");
const goalList = document.getElementById("goalList");

let dailyGoals = JSON.parse(localStorage.getItem("dailyGoals") || "[]");

function saveGoals() {
  localStorage.setItem("dailyGoals", JSON.stringify(dailyGoals));
}

function renderGoals() {
  goalList.innerHTML = "";
  dailyGoals.forEach((goal, i) => {
    const li = document.createElement("li");
    if (goal.completed) li.classList.add("completed");
    li.innerHTML = `
      <span>${goal.text}</span>
      <div class="goal-buttons">
        <button class="goal-btn toggle" title="Complete">${goal.completed ? "⟳" : "✓"}</button>
        <button class="goal-btn delete" title="Delete">✖</button>
      </div>
    `;

    li.querySelector(".toggle").addEventListener("click", () => {
      dailyGoals[i].completed = !dailyGoals[i].completed;
      saveGoals();
      renderGoals();
    });

    li.querySelector(".delete").addEventListener("click", () => {
      dailyGoals.splice(i, 1);
      saveGoals();
      renderGoals();
    });

    goalList.appendChild(li);
  });
}

addGoalBtn.addEventListener("click", addGoal);
goalInput.addEventListener("keypress", e => {
  if (e.key === "Enter") addGoal();
});

function addGoal() {
  const text = goalInput.value.trim();
  if (!text) return;
  dailyGoals.push({ text, completed: false });
  goalInput.value = "";
  saveGoals();
  renderGoals();
  pulseAddGoal();
}

function pulseAddGoal() {
  goalInput.style.transition = "transform 0.2s";
  goalInput.style.transform = "scale(1.05)";
  setTimeout(() => (goalInput.style.transform = "scale(1)"), 200);
}

// Initial draw
renderGoals();