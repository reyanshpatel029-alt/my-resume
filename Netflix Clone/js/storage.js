const PREFIX = "netflix_clone_";

const defaultProfiles = [
  { id: "owner", name: "Reyansh", kids: false },
  { id: "guest", name: "Guest", kids: false },
  { id: "kids", name: "Kids", kids: true }
];

function storageKey(key) {
  return `${PREFIX}${key}`;
}

export function readStore(key, fallback = null) {
  try {
    const value = localStorage.getItem(storageKey(key));
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`Could not read ${key}`, error);
    return fallback;
  }
}

export function writeStore(key, value) {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not save ${key}`, error);
  }
}

export function removeStore(key) {
  localStorage.removeItem(storageKey(key));
}

export function showToast(message, type = "info") {
  document.dispatchEvent(new CustomEvent("app:toast", { detail: { message, type } }));
}

export function getProfiles() {
  const profiles = readStore("profiles", null);
  if (Array.isArray(profiles) && profiles.length) return profiles;
  writeStore("profiles", defaultProfiles);
  return defaultProfiles;
}

export function addProfile(name, kids = false) {
  const profiles = getProfiles();
  const profile = {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
    name: name.trim(),
    kids
  };
  const nextProfiles = [...profiles, profile];
  writeStore("profiles", nextProfiles);
  return profile;
}

export function removeProfile(id) {
  const nextProfiles = getProfiles().filter((profile) => profile.id !== id);
  writeStore("profiles", nextProfiles.length ? nextProfiles : defaultProfiles);
  if (getActiveProfile()?.id === id) {
    writeStore("active_profile", nextProfiles[0] || defaultProfiles[0]);
  }
  return getProfiles();
}

export function getActiveProfile() {
  const active = readStore("active_profile", null);
  const profiles = getProfiles();
  return profiles.find((profile) => profile.id === active?.id) || profiles[0];
}

export function setActiveProfile(id) {
  const profile = getProfiles().find((item) => item.id === id);
  if (profile) writeStore("active_profile", profile);
  return profile;
}

export function getTheme() {
  return readStore("theme", "dark");
}

export function setTheme(theme) {
  writeStore("theme", theme);
  document.body.classList.toggle("theme-light", theme === "light");
}

export function applyStoredTheme() {
  setTheme(getTheme());
}

export function toggleTheme() {
  const nextTheme = getTheme() === "dark" ? "light" : "dark";
  setTheme(nextTheme);
  showToast(`${nextTheme === "dark" ? "Dark" : "Light"} theme saved`, "success");
}

export function getMyList() {
  return readStore("my_list", []);
}

export function isInMyList(movieId) {
  return getMyList().includes(movieId);
}

export function toggleMyList(movieId) {
  const list = getMyList();
  const exists = list.includes(movieId);
  const nextList = exists ? list.filter((id) => id !== movieId) : [...list, movieId];
  writeStore("my_list", nextList);
  showToast(exists ? "Movie removed" : "Movie added", exists ? "warning" : "success");
  return !exists;
}

export function getReaction(movieId) {
  return readStore("reactions", {})[movieId] || null;
}

export function setReaction(movieId, reaction) {
  const reactions = readStore("reactions", {});
  reactions[movieId] = reactions[movieId] === reaction ? null : reaction;
  if (!reactions[movieId]) delete reactions[movieId];
  writeStore("reactions", reactions);
  showToast(reactions[movieId] === "like" ? "Liked" : reactions[movieId] === "dislike" ? "Disliked" : "Reaction removed", "success");
  return reactions[movieId] || null;
}

export function getProgress(movieId, fallbackPercent = 0) {
  const progress = readStore("watch_progress", {});
  return progress[movieId]?.percent ?? fallbackPercent ?? 0;
}

export function getProgressDetail(movieId) {
  return readStore("watch_progress", {})[movieId] || null;
}

export function saveProgress(movieId, currentTime, duration) {
  if (!movieId || !Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return;
  const progress = readStore("watch_progress", {});
  const percent = Math.min(99, Math.max(0, Math.round((currentTime / duration) * 100)));
  progress[movieId] = {
    currentTime,
    duration,
    percent,
    updatedAt: Date.now()
  };
  writeStore("watch_progress", progress);
}

export function getContinueIds() {
  const progress = readStore("watch_progress", {});
  return Object.entries(progress)
    .filter(([, item]) => item.percent > 2 && item.percent < 98)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .map(([id]) => id);
}

export function saveLastSearch(query) {
  writeStore("last_search", query);
}

export function getLastSearch() {
  return readStore("last_search", "");
}
