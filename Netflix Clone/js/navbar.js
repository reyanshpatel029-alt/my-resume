import { applyStoredTheme, getActiveProfile, showToast, toggleTheme } from "./storage.js";
import { throttle } from "./animations.js";

let keyboardBound = false;

export function setupNavbar() {
  applyStoredTheme();
  setupActiveAvatar();
  setupMobileMenu();
  setupActiveLink();
  setupStickyNavbar();
  setupNotificationButton();
  setupKeyboardThemeToggle();
}

function setupActiveAvatar() {
  const profile = getActiveProfile();
  document.querySelectorAll("[data-active-avatar]").forEach((avatar) => {
    avatar.textContent = profile?.name?.trim()?.[0]?.toUpperCase() || "R";
  });
}

function setupMobileMenu() {
  const toggle = document.querySelector("[data-mobile-toggle]");
  const menu = document.querySelector("[data-nav-menu]");
  if (!toggle || !menu) return;

  const close = () => {
    toggle.classList.remove("open");
    menu.classList.remove("open");
    toggle.setAttribute("aria-label", "Open menu");
  };

  toggle.addEventListener("click", () => {
    const open = !menu.classList.contains("open");
    menu.classList.toggle("open", open);
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

function setupActiveLink() {
  const page = document.documentElement.dataset.page;
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const category = params.get("category");
  const language = params.get("language");

  document.querySelectorAll("[data-nav-link]").forEach((link) => {
    const url = new URL(link.href);
    const linkParams = url.searchParams;
    let active = false;

    if (page === "home" && url.pathname.endsWith("index.html")) active = true;
    if (page === "search" && type && linkParams.get("type") === type) active = true;
    if (page === "search" && category && linkParams.get("category") === category) active = true;
    if (page === "search" && language && linkParams.get("language") === language) active = true;

    link.classList.toggle("active", active);
  });
}

function setupStickyNavbar() {
  const navbar = document.querySelector("[data-navbar]");
  if (!navbar) return;

  const update = throttle(() => {
    navbar.classList.toggle("scrolled", window.scrollY > 12);
  }, 80);

  update();
  window.addEventListener("scroll", update, { passive: true });
}

function setupNotificationButton() {
  document.querySelector("[data-notifications]")?.addEventListener("click", () => {
    showToast("No new notifications", "info");
  });
}

function setupKeyboardThemeToggle() {
  if (keyboardBound) return;
  keyboardBound = true;
  document.addEventListener("keydown", (event) => {
    if (event.altKey && event.key.toLowerCase() === "t") toggleTheme();
  });
}
