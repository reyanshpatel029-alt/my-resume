import { readStore, showToast, writeStore } from "./storage.js";
import { setupRipple, setupToasts } from "./animations.js";

document.addEventListener("DOMContentLoaded", () => {
  setupToasts();
  setupRipple();

  const form = document.querySelector("[data-login-form]");
  const email = form.elements.email;
  const password = form.elements.password;
  const remember = form.elements.remember;
  const savedEmail = readStore("remembered_email", "");

  if (savedEmail) {
    email.value = savedEmail;
    remember.checked = true;
  }

  document.querySelector("[data-toggle-password]")?.addEventListener("click", (event) => {
    const visible = password.type === "text";
    password.type = visible ? "password" : "text";
    event.currentTarget.textContent = visible ? "Show" : "Hide";
  });

  document.querySelector("[data-forgot]")?.addEventListener("click", () => {
    showToast("Password reset link sent", "success");
  });

  document.querySelector("[data-signup]")?.addEventListener("click", () => {
    showToast("Demo account created", "success");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearErrors();

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    const validPassword = password.value.trim().length >= 6;

    if (!validEmail) setError("email", "Enter a valid email address.");
    if (!validPassword) setError("password", "Password must be at least 6 characters.");
    if (!validEmail || !validPassword) return;

    if (remember.checked) writeStore("remembered_email", email.value.trim());
    else writeStore("remembered_email", "");

    writeStore("auth_user", { email: email.value.trim(), signedInAt: Date.now() });
    showToast("Signed in", "success");
    setTimeout(() => {
      window.location.href = "profile.html";
    }, 650);
  });
});

function setError(name, message) {
  const error = document.querySelector(`[data-error="${name}"]`);
  if (error) error.textContent = message;
}

function clearErrors() {
  document.querySelectorAll("[data-error]").forEach((error) => {
    error.textContent = "";
  });
}
