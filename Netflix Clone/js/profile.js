import { addProfile, getActiveProfile, getProfiles, removeProfile, setActiveProfile, showToast } from "./storage.js";
import { setupRipple, setupToasts } from "./animations.js";

let manageMode = false;

document.addEventListener("DOMContentLoaded", () => {
  setupToasts();
  setupRipple();
  renderProfiles();

  document.querySelector("[data-add-profile]")?.addEventListener("click", () => {
    const name = prompt("Profile name");
    if (!name?.trim()) return;
    const kids = confirm("Is this a kids profile?");
    addProfile(name, kids);
    showToast("Profile updated", "success");
    renderProfiles();
  });

  document.querySelector("[data-manage-profiles]")?.addEventListener("click", (event) => {
    manageMode = !manageMode;
    event.currentTarget.textContent = manageMode ? "Done" : "Manage Profiles";
    renderProfiles();
  });
});

function renderProfiles() {
  const grid = document.querySelector("[data-profiles]");
  const profiles = getProfiles();
  const active = getActiveProfile();
  grid.innerHTML = profiles
    .map(
      (profile) => `
        <button class="profile-card ${profile.kids ? "kids" : ""} ${active?.id === profile.id ? "active" : ""}" data-profile-id="${profile.id}">
          <span class="avatar-tile">${profile.name.trim()[0].toUpperCase()}</span>
          <span class="profile-name">
            ${profile.name}
            ${manageMode ? `<span class="remove-profile" data-remove-profile="${profile.id}" aria-label="Remove ${profile.name}">×</span>` : ""}
          </span>
        </button>
      `
    )
    .join("");

  grid.onclick = (event) => {
    const removeButton = event.target.closest("[data-remove-profile]");
    if (removeButton) {
      event.stopPropagation();
      if (getProfiles().length <= 1) return showToast("Keep at least one profile", "warning");
      removeProfile(removeButton.dataset.removeProfile);
      showToast("Profile updated", "success");
      renderProfiles();
      return;
    }

    const card = event.target.closest("[data-profile-id]");
    if (!card || manageMode) return;
    const profile = setActiveProfile(card.dataset.profileId);
    showToast(`${profile.name} selected`, "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 520);
  };
}
