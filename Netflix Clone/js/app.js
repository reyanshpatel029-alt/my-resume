import { getCategories, getContinueMovies, getFeaturedMovie, getMovies, getMoviesByCategory } from "./api.js";
import { getContinueIds } from "./storage.js";
import { hideLoader, notifyReady, setBackgroundWithFallback, setupModal, setupRevealAnimations, setupRipple, setupToasts } from "./animations.js";
import { setupNavbar } from "./navbar.js";
import { renderMovieRows, renderRow, setupCardActions } from "./slider.js";

document.addEventListener("DOMContentLoaded", initHome);

async function initHome() {
  setupToasts();
  setupRipple();
  setupNavbar();

  try {
    const [movies, categories] = await Promise.all([getMovies(), getCategories()]);
    setupModal(movies);
    setupHero(movies);
    setupRows(movies, categories);
    setupCardActions(document, movies);
    setupRevealAnimations();
    notifyReady("Catalog loaded");
  } catch (error) {
    console.error(error);
  } finally {
    hideLoader();
  }
}

function setupHero(movies) {
  let currentMovie = getFeaturedMovie(movies);
  const backdrop = document.querySelector("[data-hero-backdrop]");
  const poster = document.querySelector("[data-hero-poster]");
  const playButton = document.querySelector("[data-hero-play]");
  const moreButton = document.querySelector("[data-hero-more]");

  const paint = (movie) => {
    currentMovie = movie;
    backdrop?.classList.add("is-changing");
    setTimeout(() => backdrop?.classList.remove("is-changing"), 420);
    setBackgroundWithFallback(backdrop, movie.backdrop, movie.id);
    setText("[data-hero-type]", movie.type);
    setText("[data-hero-title]", movie.title);
    setText("[data-hero-description]", movie.description);
    setText("[data-hero-rating]", `${movie.rating} Rating`);
    setText("[data-hero-year]", movie.year);
    setText("[data-hero-age]", movie.age);
    setText("[data-hero-genre]", movie.genres.slice(0, 3).join(" / "));

    if (poster) {
      poster.alt = `${movie.title} poster`;
      poster.onerror = () => {
        poster.onerror = null;
        poster.src = `https://picsum.photos/seed/netflix-${encodeURIComponent(movie.id)}-poster/500/750`;
      };
      poster.src = movie.poster;
    }
  };

  paint(currentMovie);

  playButton?.addEventListener("click", () => {
    window.location.href = `movie.html?id=${encodeURIComponent(currentMovie.id)}`;
  });

  moreButton?.addEventListener("click", () => {
    import("./animations.js").then(({ openMovieModal }) => openMovieModal(currentMovie, movies));
  });

  setInterval(() => {
    paint(getFeaturedMovie(movies));
  }, 8500);
}

function setupRows(movies, categories) {
  const continueContainer = document.querySelector("#continue-watching");
  const rowsContainer = document.querySelector("#movie-rows");
  const continueMovies = getContinueMovies(movies, getContinueIds());
  const myListMovies = getMoviesByCategory(movies, "my-list");

  continueContainer.innerHTML = "";
  renderRow(continueContainer, {
    id: "continue",
    title: "Continue Watching",
    movies: continueMovies.slice(0, 12)
  });

  renderMovieRows(rowsContainer, movies, categories);

  if (myListMovies.length) {
    renderRow(rowsContainer, {
      id: "my-list",
      title: "My List",
      movies: myListMovies
    });
  }
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value ?? "";
}
