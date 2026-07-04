const STORAGE_KEY = "productivityDashboardData.v1";
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const YEARS = Array.from({ length: 11 }, (_, index) => 2025 + index);
const DAY_COUNT = 31;
const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const elements = {
  dashboardTitle: document.querySelector("#dashboardTitle"),
  monthSelect: document.querySelector("#monthSelect"),
  yearSelect: document.querySelector("#yearSelect"),
  addHabitBtn: document.querySelector("#addHabitBtn"),
  habitTableHead: document.querySelector("#habitTableHead"),
  habitTableBody: document.querySelector("#habitTableBody"),
  habitTableFoot: document.querySelector("#habitTableFoot"),
  monthlyProgressText: document.querySelector("#monthlyProgressText"),
  monthlyProgressFill: document.querySelector("#monthlyProgressFill"),
  weekRange: document.querySelector("#weekRange"),
  weeklyGrid: document.querySelector("#weeklyGrid"),
  habitTrendChart: document.querySelector("#habitTrendChart"),
  stats: {
    habitCount: document.querySelector("#statHabitCount"),
    completedHabits: document.querySelector("#statCompletedHabits"),
    completion: document.querySelector("#statCompletion"),
    currentStreak: document.querySelector("#statCurrentStreak"),
    longestStreak: document.querySelector("#statLongestStreak"),
    totalTasks: document.querySelector("#statTotalTasks"),
    completedTasks: document.querySelector("#statCompletedTasks"),
    studyHours: document.querySelector("#statStudyHours"),
  },
  metrics: {
    dailyCompletion: document.querySelector("#metricDailyCompletion"),
    weeklyCompletion: document.querySelector("#metricWeeklyCompletion"),
    monthlyCompletion: document.querySelector("#metricMonthlyCompletion"),
    mostProductive: document.querySelector("#metricMostProductive"),
    leastProductive: document.querySelector("#metricLeastProductive"),
    taskRate: document.querySelector("#metricTaskRate"),
    habitRate: document.querySelector("#metricHabitRate"),
    studyHours: document.querySelector("#metricStudyHours"),
  },
};

let store = loadStore();
let selectedMonthIndex = getInitialMonthIndex();
let selectedYear = getInitialYear();
let activeWeekStart = getDefaultWeekStart();
let habitTrendChart = null;

initialize();

function initialize() {
  populateDateControls();
  bindGlobalEvents();
  renderAll();
}

function populateDateControls() {
  MONTHS.forEach((month, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = month;
    elements.monthSelect.append(option);
  });

  YEARS.forEach((year) => {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    elements.yearSelect.append(option);
  });

  elements.monthSelect.value = String(selectedMonthIndex);
  elements.yearSelect.value = String(selectedYear);
}

function bindGlobalEvents() {
  elements.monthSelect.addEventListener("change", () => {
    selectedMonthIndex = Number(elements.monthSelect.value);
    activeWeekStart = getDefaultWeekStart();
    renderAll();
  });

  elements.yearSelect.addEventListener("change", () => {
    selectedYear = Number(elements.yearSelect.value);
    activeWeekStart = getDefaultWeekStart();
    renderAll();
  });

  elements.addHabitBtn.addEventListener("click", addHabit);
}

function renderAll() {
  const monthData = ensureMonthData();
  const analytics = calculateAnalytics(monthData);

  monthData.analytics = analytics.snapshot;
  monthData.progress = {
    monthlyHabitProgress: analytics.habitCompletionRate,
    monthlyTaskProgress: analytics.taskCompletionRate,
    monthlyCompletion: analytics.monthlyCompletion,
  };
  saveStore();

  renderTitle();
  renderStats(analytics);
  renderHabitTable(monthData, analytics);
  renderMonthlyProgress(analytics.habitCompletionRate);
  renderTrendChart(analytics);
  renderWeeklyDashboard(monthData, analytics);
  renderAnalyticsCards(analytics);
}

function renderTitle() {
  elements.dashboardTitle.textContent = `${MONTHS[selectedMonthIndex].toUpperCase()} ${selectedYear}`;
}

function renderStats(analytics) {
  elements.stats.habitCount.textContent = String(analytics.habitCount);
  elements.stats.completedHabits.textContent = String(analytics.completedHabitChecks);
  elements.stats.completion.textContent = formatPercent(analytics.habitCompletionRate);
  elements.stats.currentStreak.textContent = String(analytics.currentStreak);
  elements.stats.longestStreak.textContent = String(analytics.longestStreak);
  elements.stats.totalTasks.textContent = String(analytics.totalTasks);
  elements.stats.completedTasks.textContent = String(analytics.completedTasks);
  elements.stats.studyHours.textContent = formatHours(analytics.studyHours);
}

function renderHabitTable(monthData, analytics) {
  elements.habitTableHead.replaceChildren();
  elements.habitTableBody.replaceChildren();
  elements.habitTableFoot.replaceChildren();

  const weeks = getMonthWeeks();
  const dates = getMonthDates();
  const weekRow = document.createElement("tr");
  const dateRow = document.createElement("tr");
  const dayRow = document.createElement("tr");
  const nameHeader = createHeaderCell("Habit Name");
  nameHeader.className = "habit-name-heading";
  nameHeader.rowSpan = 3;
  weekRow.append(nameHeader);

  weeks.forEach((week) => {
    const weekCell = createHeaderCell(week.label);
    weekCell.className = "week-head";
    weekCell.colSpan = week.dates.length;
    weekRow.append(weekCell);

    week.dates.forEach((date) => {
      const dateCell = createHeaderCell("");
      dateCell.className = "date-head";
      const dateNumber = document.createElement("span");
      dateNumber.className = "date-number";
      dateNumber.textContent = String(date.getDate());
      const dateMonth = document.createElement("span");
      dateMonth.className = "date-month";
      dateMonth.textContent = getMonthShortName(date);
      dateCell.append(dateNumber, dateMonth);
      dateRow.append(dateCell);

      const dayCell = createHeaderCell(formatWeekdayShort(date));
      dayCell.className = "day-head";
      dayRow.append(dayCell);
    });
  });

  elements.habitTableHead.append(weekRow, dateRow, dayRow);

  monthData.habits.forEach((habit, habitIndex) => {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const cellWrap = document.createElement("div");
    cellWrap.className = "habit-name-cell";

    const title = document.createElement("span");
    title.className = "habit-title";
    title.textContent = habit.name;

    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(
      createMiniButton("Up", () => moveHabit(habitIndex, -1), habitIndex === 0),
      createMiniButton("Down", () => moveHabit(habitIndex, 1), habitIndex === monthData.habits.length - 1),
      createMiniButton("Edit", () => editHabit(habit.id)),
      createMiniButton("Copy", () => duplicateHabit(habit.id)),
      createMiniButton("Delete", () => deleteHabit(habit.id))
    );

    cellWrap.append(title, actions);
    nameCell.append(cellWrap);
    row.append(nameCell);

    dates.forEach((date) => {
      const dayIndex = date.getDate() - 1;
      const cell = document.createElement("td");
      const tickButton = document.createElement("button");
      tickButton.type = "button";
      tickButton.className = habit.checks[dayIndex] ? "excel-check is-checked" : "excel-check";
      tickButton.textContent = habit.checks[dayIndex] ? "✓" : "";
      tickButton.setAttribute("aria-label", `${habit.name} ${formatDateShort(date)}`);
      tickButton.setAttribute("aria-pressed", String(Boolean(habit.checks[dayIndex])));
      tickButton.addEventListener("click", () => {
        habit.checks[dayIndex] = !habit.checks[dayIndex];
        saveStore();
        renderAll();
      });

      cell.append(tickButton);
      row.append(cell);
    });

    elements.habitTableBody.append(row);
  });

  const footerRow = document.createElement("tr");
  const labelCell = document.createElement("td");
  labelCell.textContent = "Daily %";
  footerRow.append(labelCell);

  analytics.dailyHabitRates.forEach((rate) => {
    const cell = document.createElement("td");
    cell.textContent = monthData.habits.length ? formatPercent(rate) : "";
    footerRow.append(cell);
  });
  elements.habitTableFoot.append(footerRow);
}

function renderMonthlyProgress(rate) {
  elements.monthlyProgressText.textContent = formatPercent(rate);
  requestAnimationFrame(() => {
    elements.monthlyProgressFill.style.width = `${rate}%`;
  });
}

function renderTrendChart(analytics) {
  if (typeof Chart === "undefined" || !elements.habitTrendChart) {
    return;
  }

  const context = elements.habitTrendChart.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, "rgba(112, 173, 71, 0.38)");
  gradient.addColorStop(1, "rgba(112, 173, 71, 0.02)");

  const dates = getMonthDates();
  const labels = dates.map((date) => `${date.getDate()} ${formatWeekdayShort(date)}`);
  const data = analytics.hasAnyHabitCheck ? analytics.dailyHabitRates : Array(dates.length).fill(null);

  if (!habitTrendChart) {
    habitTrendChart = new Chart(context, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Daily Completion",
            data,
            fill: true,
            backgroundColor: gradient,
            borderColor: "#5A8F39",
            borderWidth: 3,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#5A8F39",
            tension: 0.42,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 650,
          easing: "easeOutQuart",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (item) => `${item.parsed.y}%`,
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: "rgba(200, 217, 194, 0.55)",
            },
            ticks: {
              color: "#6b7280",
              maxRotation: 0,
              autoSkip: true,
            },
          },
          y: {
            min: 0,
            max: 100,
            grid: {
              color: "rgba(200, 217, 194, 0.55)",
            },
            ticks: {
              stepSize: 20,
              color: "#6b7280",
              callback: (value) => `${value}%`,
            },
          },
        },
      },
    });
    return;
  }

  habitTrendChart.data.labels = labels;
  habitTrendChart.data.datasets[0].data = data;
  habitTrendChart.data.datasets[0].backgroundColor = gradient;
  habitTrendChart.update();
}

function renderWeeklyDashboard(monthData, analytics) {
  elements.weeklyGrid.replaceChildren();
  const weeks = getMonthWeeks();
  const today = new Date();
  elements.weekRange.textContent = `${MONTHS[selectedMonthIndex]} ${selectedYear}`;

  const table = document.createElement("table");
  table.className = "week-table";
  table.setAttribute("aria-label", `${MONTHS[selectedMonthIndex]} ${selectedYear} weekly calendar`);

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.append(createHeaderCell("Week"));
  WEEK_DAYS.forEach((day) => headRow.append(createHeaderCell(day)));
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  weeks.forEach((week) => {
    const row = document.createElement("tr");
    const weekCell = document.createElement("th");
    weekCell.scope = "row";
    weekCell.textContent = week.label;
    row.append(weekCell);

    WEEK_DAYS.forEach((dayName, dayIndex) => {
      const cell = document.createElement("td");
      const date = week.dates.find((weekDate) => getWeekdayIndex(weekDate) === dayIndex);

      if (!date) {
        cell.className = "is-empty";
        row.append(cell);
        return;
      }

      if (isSameDay(date, today)) {
        cell.className = "is-today";
      }

      const dateWrap = document.createElement("div");
      dateWrap.className = "week-date";
      const dateNumber = document.createElement("span");
      dateNumber.className = "week-date-number";
      dateNumber.textContent = String(date.getDate());
      const dateDay = document.createElement("span");
      dateDay.className = "week-date-day";
      dateDay.textContent = dayName;
      dateWrap.append(dateNumber, dateDay);
      cell.append(dateWrap);
      row.append(cell);
    });

    tbody.append(row);
  });

  table.append(thead, tbody);
  elements.weeklyGrid.append(table);

  elements.metrics.weeklyCompletion.textContent = formatPercent(analytics.weeklyCompletion);
}

function createTaskItem(monthData, dayNumber, task, taskIndex, taskCount) {
  const item = document.createElement("div");
  item.className = task.complete ? "task-item is-complete" : "task-item";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(task.complete);
  checkbox.setAttribute("aria-label", task.title);
  checkbox.addEventListener("change", () => {
    task.complete = checkbox.checked;
    saveStore();
    renderAll();
  });

  const body = document.createElement("div");
  body.className = "task-body";

  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.title;

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(
    createMiniButton("Up", () => moveTask(monthData, dayNumber, taskIndex, -1), taskIndex === 0),
    createMiniButton("Down", () => moveTask(monthData, dayNumber, taskIndex, 1), taskIndex === taskCount - 1),
    createMiniButton("Edit", () => editTask(task)),
    createMiniButton("Delete", () => deleteTask(monthData, dayNumber, task.id))
  );

  body.append(title, actions);
  item.append(checkbox, body);
  return item;
}

function renderAnalyticsCards(analytics) {
  elements.metrics.dailyCompletion.textContent = formatPercent(analytics.dailyCompletion);
  elements.metrics.weeklyCompletion.textContent = formatPercent(analytics.weeklyCompletion);
  elements.metrics.monthlyCompletion.textContent = formatPercent(analytics.monthlyCompletion);
  elements.metrics.mostProductive.textContent = analytics.mostProductiveDay;
  elements.metrics.leastProductive.textContent = analytics.leastProductiveDay;
  elements.metrics.taskRate.textContent = formatPercent(analytics.taskCompletionRate);
  elements.metrics.habitRate.textContent = formatPercent(analytics.habitCompletionRate);
  elements.metrics.studyHours.textContent = formatHours(analytics.studyHours);
}

function calculateAnalytics(monthData) {
  const daysInMonth = getDaysInSelectedMonth();
  const habitCount = monthData.habits.length;
  const totalHabitChecks = habitCount * daysInMonth;
  const completedHabitChecks = monthData.habits.reduce(
    (total, habit) => total + habit.checks.slice(0, daysInMonth).filter(Boolean).length,
    0
  );
  const habitCompletionRate = toPercent(completedHabitChecks, totalHabitChecks);
  const dailyHabitRates = Array.from({ length: daysInMonth }, (_, dayIndex) => {
    if (!habitCount) {
      return 0;
    }
    const completed = monthData.habits.filter((habit) => habit.checks[dayIndex]).length;
    return toPercent(completed, habitCount);
  });
  const dailyAllHabitsComplete = Array.from({ length: daysInMonth }, (_, dayIndex) => {
    return habitCount > 0 && monthData.habits.every((habit) => habit.checks[dayIndex]);
  });
  const dailyAnyHabitCheck = Array.from({ length: daysInMonth }, (_, dayIndex) => {
    return monthData.habits.some((habit) => habit.checks[dayIndex]);
  });
  const hasAnyHabitCheck = dailyAnyHabitCheck.some(Boolean);
  const streaks = calculateStreaks(dailyAllHabitsComplete, dailyAnyHabitCheck);
  const taskSummary = summarizeTasks(monthData);
  const studyHours = summarizeStudyHours(monthData);
  const taskCompletionRate = toPercent(taskSummary.completed, taskSummary.total);
  const monthlyTotalUnits = totalHabitChecks + taskSummary.total;
  const monthlyCompletedUnits = completedHabitChecks + taskSummary.completed;
  const monthlyCompletion = toPercent(monthlyCompletedUnits, monthlyTotalUnits);
  const combinedDailyScores = calculateCombinedDailyScores(monthData, dailyHabitRates);
  const focusDayNumber = getFocusDayNumber();
  const dailyCompletion = combinedDailyScores[focusDayNumber - 1] ?? 0;
  const weeklyCompletion = calculateWeeklyCompletion(combinedDailyScores);
  const productivity = calculateProductiveDays(combinedDailyScores);

  return {
    habitCount,
    completedHabitChecks,
    habitCompletionRate,
    dailyHabitRates,
    hasAnyHabitCheck,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    totalTasks: taskSummary.total,
    completedTasks: taskSummary.completed,
    taskCompletionRate,
    studyHours,
    dailyCompletion,
    weeklyCompletion,
    monthlyCompletion,
    mostProductiveDay: productivity.most,
    leastProductiveDay: productivity.least,
    snapshot: {
      dailyCompletion,
      weeklyCompletion,
      monthlyCompletion,
      mostProductiveDay: productivity.most,
      leastProductiveDay: productivity.least,
      taskCompletionRate,
      habitCompletionRate,
      studyHours,
    },
  };
}

function calculateStreaks(dailyAllComplete, dailyAnyCheck) {
  let longest = 0;
  let run = 0;

  dailyAllComplete.forEach((isComplete) => {
    run = isComplete ? run + 1 : 0;
    longest = Math.max(longest, run);
  });

  const lastActivityIndex = dailyAnyCheck.lastIndexOf(true);
  if (lastActivityIndex === -1) {
    return { current: 0, longest };
  }

  let current = 0;
  for (let index = lastActivityIndex; index >= 0; index -= 1) {
    if (!dailyAllComplete[index]) {
      break;
    }
    current += 1;
  }

  return { current, longest };
}

function summarizeTasks(monthData) {
  let total = 0;
  let completed = 0;

  Object.values(monthData.tasks).forEach((tasks) => {
    if (!Array.isArray(tasks)) {
      return;
    }
    total += tasks.length;
    completed += tasks.filter((task) => task.complete).length;
  });

  return { total, completed };
}

function summarizeStudyHours(monthData) {
  return Object.values(monthData.studyHours).reduce((total, value) => {
    const hours = Number(value);
    return Number.isFinite(hours) ? total + hours : total;
  }, 0);
}

function calculateCombinedDailyScores(monthData, dailyHabitRates) {
  return Array.from({ length: getDaysInSelectedMonth() }, (_, index) => {
    const dayNumber = index + 1;
    const parts = [];

    if (monthData.habits.length) {
      parts.push(dailyHabitRates[index]);
    }

    const tasks = getDayTasks(monthData, dayNumber);
    if (tasks.length) {
      const completed = tasks.filter((task) => task.complete).length;
      parts.push(toPercent(completed, tasks.length));
    }

    if (!parts.length) {
      return null;
    }

    return Math.round(parts.reduce((total, value) => total + value, 0) / parts.length);
  });
}

function calculateWeeklyCompletion(combinedDailyScores) {
  const scores = getWeekDates(activeWeekStart)
    .filter(isInSelectedMonth)
    .map((date) => combinedDailyScores[date.getDate() - 1])
    .filter((value) => value !== null);

  if (!scores.length) {
    return 0;
  }

  return Math.round(scores.reduce((total, value) => total + value, 0) / scores.length);
}

function calculateProductiveDays(combinedDailyScores) {
  const entries = combinedDailyScores
    .map((score, index) => ({ score, day: index + 1 }))
    .filter((entry) => entry.score !== null);

  if (!entries.length) {
    return { most: "-", least: "-" };
  }

  entries.sort((a, b) => b.score - a.score || a.day - b.day);
  const most = entries[0];
  const least = entries[entries.length - 1];

  return {
    most: `${formatWeekdayForDay(most.day)} ${most.day}`,
    least: `${formatWeekdayForDay(least.day)} ${least.day}`,
  };
}

function addHabit() {
  const name = window.prompt("Habit name");
  const cleanName = cleanText(name);
  if (!cleanName) {
    return;
  }

  const monthData = ensureMonthData();
  monthData.habits.push({
    id: createId("habit"),
    name: cleanName,
    checks: Array(DAY_COUNT).fill(false),
  });
  saveStore();
  renderAll();
}

function editHabit(habitId) {
  const monthData = ensureMonthData();
  const habit = monthData.habits.find((item) => item.id === habitId);
  if (!habit) {
    return;
  }

  const name = window.prompt("Habit name", habit.name);
  const cleanName = cleanText(name);
  if (!cleanName) {
    return;
  }

  habit.name = cleanName;
  saveStore();
  renderAll();
}

function deleteHabit(habitId) {
  if (!window.confirm("Delete habit?")) {
    return;
  }

  const monthData = ensureMonthData();
  monthData.habits = monthData.habits.filter((habit) => habit.id !== habitId);
  saveStore();
  renderAll();
}

function duplicateHabit(habitId) {
  const monthData = ensureMonthData();
  const habit = monthData.habits.find((item) => item.id === habitId);
  if (!habit) {
    return;
  }

  monthData.habits.push({
    id: createId("habit"),
    name: habit.name,
    checks: Array(DAY_COUNT).fill(false),
  });
  saveStore();
  renderAll();
}

function moveHabit(index, direction) {
  const monthData = ensureMonthData();
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= monthData.habits.length) {
    return;
  }

  const [habit] = monthData.habits.splice(index, 1);
  monthData.habits.splice(nextIndex, 0, habit);
  saveStore();
  renderAll();
}

function addTask(monthData, dayNumber) {
  const title = window.prompt("Task name");
  const cleanTitle = cleanText(title);
  if (!cleanTitle) {
    return;
  }

  const tasks = getDayTasks(monthData, dayNumber);
  tasks.push({
    id: createId("task"),
    title: cleanTitle,
    complete: false,
  });
  monthData.tasks[String(dayNumber)] = tasks;
  saveStore();
  renderAll();
}

function editTask(task) {
  const title = window.prompt("Task name", task.title);
  const cleanTitle = cleanText(title);
  if (!cleanTitle) {
    return;
  }

  task.title = cleanTitle;
  saveStore();
  renderAll();
}

function deleteTask(monthData, dayNumber, taskId) {
  if (!window.confirm("Delete task?")) {
    return;
  }

  monthData.tasks[String(dayNumber)] = getDayTasks(monthData, dayNumber).filter((task) => task.id !== taskId);
  saveStore();
  renderAll();
}

function moveTask(monthData, dayNumber, index, direction) {
  const tasks = getDayTasks(monthData, dayNumber);
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= tasks.length) {
    return;
  }

  const [task] = tasks.splice(index, 1);
  tasks.splice(nextIndex, 0, task);
  monthData.tasks[String(dayNumber)] = tasks;
  saveStore();
  renderAll();
}

function updateStudyHours(monthData, dayNumber, value) {
  const cleanValue = Number(value);
  const key = String(dayNumber);

  if (!Number.isFinite(cleanValue) || cleanValue <= 0) {
    delete monthData.studyHours[key];
  } else {
    monthData.studyHours[key] = Math.round(cleanValue * 100) / 100;
  }

  saveStore();
  renderAll();
}

function getDayTasks(monthData, dayNumber) {
  const key = String(dayNumber);
  if (!Array.isArray(monthData.tasks[key])) {
    monthData.tasks[key] = [];
  }
  return monthData.tasks[key];
}

function getStudyHours(monthData, dayNumber) {
  const value = monthData.studyHours[String(dayNumber)];
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
    return "";
  }
  return String(value);
}

function ensureMonthData() {
  if (!store[String(selectedYear)] || typeof store[String(selectedYear)] !== "object") {
    store[String(selectedYear)] = {};
  }

  const yearData = store[String(selectedYear)];
  const month = MONTHS[selectedMonthIndex];
  if (!yearData[month] || typeof yearData[month] !== "object") {
    yearData[month] = {
      habits: [],
      tasks: {},
      studyHours: {},
      analytics: {},
      progress: {},
    };
  }

  const monthData = yearData[month];
  monthData.habits = Array.isArray(monthData.habits) ? monthData.habits : [];
  monthData.tasks = monthData.tasks && typeof monthData.tasks === "object" ? monthData.tasks : {};
  monthData.studyHours =
    monthData.studyHours && typeof monthData.studyHours === "object" ? monthData.studyHours : {};
  monthData.analytics = monthData.analytics && typeof monthData.analytics === "object" ? monthData.analytics : {};
  monthData.progress = monthData.progress && typeof monthData.progress === "object" ? monthData.progress : {};

  monthData.habits = monthData.habits.map((habit) => ({
    id: habit.id || createId("habit"),
    name: cleanText(habit.name),
    checks: normalizeChecks(habit.checks),
  })).filter((habit) => habit.name);

  Object.keys(monthData.tasks).forEach((day) => {
    if (!Array.isArray(monthData.tasks[day])) {
      monthData.tasks[day] = [];
      return;
    }
    monthData.tasks[day] = monthData.tasks[day].map((task) => ({
      id: task.id || createId("task"),
      title: cleanText(task.title),
      complete: Boolean(task.complete),
    })).filter((task) => task.title);
  });

  return monthData;
}

function normalizeChecks(checks) {
  const source = Array.isArray(checks) ? checks : [];
  return Array.from({ length: DAY_COUNT }, (_, index) => Boolean(source[index]));
}

function loadStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveStore() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getInitialMonthIndex() {
  return new Date().getMonth();
}

function getInitialYear() {
  const currentYear = new Date().getFullYear();
  if (YEARS.includes(currentYear)) {
    return currentYear;
  }
  return YEARS[0];
}

function getDefaultWeekStart() {
  const today = new Date();
  const selectedDate =
    today.getFullYear() === selectedYear && today.getMonth() === selectedMonthIndex
      ? today
      : new Date(selectedYear, selectedMonthIndex, 1);
  return getMonday(selectedDate);
}

function getDaysInSelectedMonth() {
  return new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
}

function getMonthDates() {
  return Array.from(
    { length: getDaysInSelectedMonth() },
    (_, index) => new Date(selectedYear, selectedMonthIndex, index + 1)
  );
}

function getMonthWeeks() {
  const weeks = [];

  getMonthDates().forEach((date) => {
    const monday = getMonday(date).getTime();
    let week = weeks.find((item) => item.key === monday);

    if (!week) {
      week = {
        key: monday,
        label: `Week ${weeks.length + 1}`,
        dates: [],
      };
      weeks.push(week);
    }

    week.dates.push(date);
  });

  return weeks;
}

function getWeekDates(startDate) {
  return Array.from({ length: 7 }, (_, index) => addDays(startDate, index));
}

function weekOverlapsSelectedMonth(startDate) {
  return getWeekDates(startDate).some(isInSelectedMonth);
}

function isInSelectedMonth(date) {
  return date.getFullYear() === selectedYear && date.getMonth() === selectedMonthIndex;
}

function getMonday(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return copy;
}

function getWeekdayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function isSameDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getFocusDayNumber() {
  const today = new Date();
  if (today.getFullYear() === selectedYear && today.getMonth() === selectedMonthIndex) {
    return Math.min(today.getDate(), getDaysInSelectedMonth());
  }

  const firstVisibleDate = getWeekDates(activeWeekStart).find(isInSelectedMonth);
  return firstVisibleDate ? firstVisibleDate.getDate() : 1;
}

function formatDateShort(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getMonthShortName(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(date);
}

function formatWeekdayShort(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(date);
}

function formatWeekdayForDay(dayNumber) {
  const date = new Date(selectedYear, selectedMonthIndex, dayNumber);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(date);
}

function formatPercent(value) {
  return `${Math.round(value || 0)}%`;
}

function formatHours(value) {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded.toFixed(2)).replace(/0+$/, "").replace(/\.$/, "");
}

function toPercent(completed, total) {
  if (!total) {
    return 0;
  }
  return Math.round((completed / total) * 100);
}

function createHeaderCell(text) {
  const cell = document.createElement("th");
  cell.scope = "col";
  cell.textContent = text;
  return cell;
}

function createMiniButton(label, onClick, disabled = false) {
  const button = document.createElement("button");
  button.className = "mini-btn";
  button.type = "button";
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

function createId(prefix) {
  const randomPart = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

function cleanText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}
