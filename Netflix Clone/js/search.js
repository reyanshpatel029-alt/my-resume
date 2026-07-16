import { filterMovies, getCategories, getMovies, getSuggestions } from "./api.js";
import { getLastSearch, saveLastSearch } from "./storage.js";
import { debounce, hideLoader, setupModal, setupRevealAnimations, setupRipple, setupToasts } from "./animations.js";
import { setupNavbar } from "./navbar.js";
import { renderMovieCard, setupCardActions } from "./slider.js";

document.addEventListener("DOMContentLoaded", initSearch);

async function initSearch() {
  setupToasts();
  setupRipple();
  setupNavbar();

  try {
    const [movies, categories] = await Promise.all([getMovies(), getCategories()]);
    const input = document.querySelector("#search-input");
    const results = document.querySelector("[data-search-results]");
    const params = new URLSearchParams(window.location.search);
    const filters = {
      type: params.get("type") || "",
      category: params.get("category") || "",
      language: params.get("language") || ""
    };
    const hasFilter = filters.type || filters.category || filters.language;
    input.value = params.has("q") ? params.get("q") : hasFilter ? "" : getLastSearch();

    setupModal(movies);
    setupCardActions(document, movies);

    const render = () => {
      const query = input.value.trim();
      if (query) saveLastSearch(query);
      renderSuggestions(movies, query);
      renderResults(results, movies, categories, { query, ...filters });
    };

    input.addEventListener("input", debounce(render, 220));
    document.querySelector("[data-suggestions]")?.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      input.value = button.dataset.suggestion;
      render();
      input.focus();
    });

    render();
    setupRevealAnimations();
  } catch (error) {
    console.error(error);
  } finally {
    hideLoader();
  }
}

function renderResults(container, movies, categories, filters) {
  const filtered = filterMovies(movies, filters);
  const noResults = document.querySelector("[data-no-results]");
  const count = document.querySelector("[data-result-count]");
  const title = document.querySelector("[data-search-title]");

  container.innerHTML = filtered.map((movie) => renderMovieCard(movie)).join("");
  noResults.hidden = filtered.length > 0;
  count.textContent = `${filtered.length} result${filtered.length === 1 ? "" : "s"}`;
  title.textContent = getTitle(categories, filters);
  import("./animations.js").then(({ setupLazyImages }) => setupLazyImages(container));
}

function renderSuggestions(movies, query) {
  const suggestions = getSuggestions(movies, query);
  const container = document.querySelector("[data-suggestions]");
  if (!container) return;
  container.innerHTML = suggestions
    .map((suggestion) => `<button type="button" data-suggestion="${escapeAttribute(suggestion)}">${suggestion}</button>`)
    .join("");
}

function getTitle(categories, filters) {
  if (filters.query) return `Results for "${filters.query}"`;
  if (filters.type) return filters.type === "Movie" ? "Movies" : "TV Shows";
  if (filters.category) return categories.find((category) => category.id === filters.category)?.title || "Search Results";
  if (filters.language) return "Browse by Language";
  return "Search Results";
}

function escapeAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
