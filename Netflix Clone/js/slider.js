import { getProgress, getReaction, isInMyList, setReaction, toggleMyList } from "./storage.js";
import { escapeHTML, icon, openMovieModal, setupLazyImages } from "./animations.js";

const actionRoots = new WeakSet();

export function renderMovieRows(container, movies, categories) {
  if (!container) return;
  container.innerHTML = "";

  categories
    .filter((category) => !["continue", "my-list"].includes(category.id))
    .forEach((category) => {
      const rowMovies = movies.filter((movie) => movie.categories?.includes(category.id));
      renderRow(container, {
        id: category.id,
        title: category.title,
        movies: rowMovies,
        showRank: category.id === "top10"
      });
    });
}

export function renderRow(container, { id = "", title, movies, showRank = false }) {
  if (!container || !movies?.length) return null;

  const section = document.createElement("section");
  section.className = "movie-row reveal";
  section.dataset.rowId = id;
  section.innerHTML = `
    <div class="section-heading">
      <h2>${escapeHTML(title)}</h2>
      <span>${movies.length} titles</span>
    </div>
    <div class="row-shell">
      <button class="slider-arrow left" data-slide="left" aria-label="Scroll ${escapeHTML(title)} left">${icon("chevronLeft")}</button>
      <div class="movie-slider" data-slider>
        ${movies.map((movie, index) => renderMovieCard(movie, { showRank, index })).join("")}
      </div>
      <button class="slider-arrow right" data-slide="right" aria-label="Scroll ${escapeHTML(title)} right">${icon("chevronRight")}</button>
    </div>
  `;

  container.append(section);
  setupSliderInteractions(section);
  setupLazyImages(section);
  return section;
}

export function renderMovieCard(movie, { showRank = false, index = 0 } = {}) {
  const listed = isInMyList(movie.id);
  const reaction = getReaction(movie.id);
  const progress = getProgress(movie.id, movie.progress);
  const genres = movie.genres.slice(0, 3).map(escapeHTML).join(" / ");
  const rank = movie.rank || index + 1;

  return `
    <article class="movie-card zoom-in" data-movie-id="${escapeHTML(movie.id)}">
      <div class="poster-wrap">
        <img data-src="${movie.poster}" data-movie-id="${escapeHTML(movie.id)}" data-kind="poster" alt="${escapeHTML(movie.title)} poster" loading="lazy">
        ${showRank ? `<span class="rank-badge">${rank}</span>` : ""}
        ${progress ? `<div class="progress-bar" aria-label="${progress}% watched"><span style="--progress:${progress}%"></span></div>` : ""}
      </div>
      <div class="card-body">
        <h3 class="card-title">${escapeHTML(movie.title)}</h3>
        <div class="card-meta">
          <span class="match-score">${Math.round(Number(movie.rating) * 10)}% Match</span>
          <span>${escapeHTML(String(movie.year))}</span>
          <span>${escapeHTML(movie.duration)}</span>
          <span>${escapeHTML(movie.age)}</span>
        </div>
        <div class="card-genres">${genres}</div>
        <div class="card-actions">
          <button class="icon-button primary" data-action="play" aria-label="Play ${escapeHTML(movie.title)}" title="Play" data-ripple>${icon("play")}</button>
          <button class="icon-button ${listed ? "active" : ""}" data-action="list" aria-label="${listed ? "Remove from" : "Add to"} My List" title="${listed ? "Remove" : "Add"}" data-ripple>${icon(listed ? "check" : "plus")}</button>
          <button class="icon-button ${reaction === "like" ? "liked active" : ""}" data-action="like" aria-label="Like ${escapeHTML(movie.title)}" title="Like" data-ripple>${icon("like")}</button>
          <button class="icon-button ${reaction === "dislike" ? "disliked active" : ""}" data-action="dislike" aria-label="Dislike ${escapeHTML(movie.title)}" title="Dislike" data-ripple>${icon("dislike")}</button>
          <button class="icon-button" data-action="more" aria-label="More info for ${escapeHTML(movie.title)}" title="More Info" data-ripple>${icon("info")}</button>
        </div>
      </div>
    </article>
  `;
}

export function setupCardActions(root, movies) {
  if (!root || actionRoots.has(root)) return;
  actionRoots.add(root);

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const card = button.closest("[data-movie-id]");
    const movie = movies.find((item) => item.id === card?.dataset.movieId);
    if (!movie) return;

    event.preventDefault();
    const action = button.dataset.action;

    if (action === "play") {
      window.location.href = `movie.html?id=${encodeURIComponent(movie.id)}`;
      return;
    }

    if (action === "more") {
      openMovieModal(movie, movies);
      return;
    }

    if (action === "list") {
      toggleMyList(movie.id);
      refreshCardStates(movie.id, root);
      return;
    }

    if (action === "like" || action === "dislike") {
      setReaction(movie.id, action);
      refreshCardStates(movie.id, root);
    }
  });
}

export function refreshCardStates(movieId, root = document) {
  root.querySelectorAll("[data-movie-id]").forEach((card) => {
    if (card.dataset.movieId !== movieId) return;
    const listed = isInMyList(movieId);
    const reaction = getReaction(movieId);
    const listButton = card.querySelector('[data-action="list"]');
    const likeButton = card.querySelector('[data-action="like"]');
    const dislikeButton = card.querySelector('[data-action="dislike"]');

    if (listButton) {
      listButton.innerHTML = icon(listed ? "check" : "plus");
      listButton.classList.toggle("active", listed);
      listButton.title = listed ? "Remove" : "Add";
      listButton.setAttribute("aria-label", listed ? "Remove from My List" : "Add to My List");
    }

    if (likeButton) {
      likeButton.classList.toggle("active", reaction === "like");
      likeButton.classList.toggle("liked", reaction === "like");
    }

    if (dislikeButton) {
      dislikeButton.classList.toggle("active", reaction === "dislike");
      dislikeButton.classList.toggle("disliked", reaction === "dislike");
    }
  });
}

function setupSliderInteractions(section) {
  const slider = section.querySelector("[data-slider]");
  if (!slider) return;

  section.querySelectorAll("[data-slide]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.slide === "left" ? -1 : 1;
      const distance = Math.round(slider.clientWidth * 0.86);
      const nearStart = slider.scrollLeft < 8;
      const nearEnd = slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 8;

      if (direction > 0 && nearEnd) {
        slider.scrollTo({ left: 0, behavior: "smooth" });
      } else if (direction < 0 && nearStart) {
        slider.scrollTo({ left: slider.scrollWidth, behavior: "smooth" });
      } else {
        slider.scrollBy({ left: distance * direction, behavior: "smooth" });
      }
    });
  });

  let isDown = false;
  let startX = 0;
  let startScroll = 0;

  slider.addEventListener("pointerdown", (event) => {
    isDown = true;
    startX = event.clientX;
    startScroll = slider.scrollLeft;
    slider.setPointerCapture(event.pointerId);
    slider.style.cursor = "grabbing";
  });

  slider.addEventListener("pointermove", (event) => {
    if (!isDown) return;
    slider.scrollLeft = startScroll - (event.clientX - startX);
  });

  ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
    slider.addEventListener(eventName, () => {
      isDown = false;
      slider.style.cursor = "";
    });
  });
}
