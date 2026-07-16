import { getReaction, isInMyList, setReaction, showToast, toggleMyList } from "./storage.js";
import { getSimilar } from "./api.js";

let modalMovies = [];

export function debounce(callback, delay = 250) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

export function throttle(callback, wait = 160) {
  let waiting = false;
  return (...args) => {
    if (waiting) return;
    waiting = true;
    callback(...args);
    setTimeout(() => {
      waiting = false;
    }, wait);
  };
}

export function hideLoader() {
  document.querySelector("[data-loader]")?.classList.add("hidden");
}

export function setupRevealAnimations(root = document) {
  const items = [...root.querySelectorAll(".reveal")];
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  items.forEach((item) => observer.observe(item));
}

export function setupRipple(root = document) {
  root.addEventListener("click", (event) => {
    const target = event.target.closest("[data-ripple]");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    target.append(ripple);
    setTimeout(() => ripple.remove(), 560);
  });
}

export function setupToasts() {
  const stack = document.querySelector("[data-toast-stack]");
  if (!stack) return;

  document.addEventListener("app:toast", (event) => {
    const toast = document.createElement("div");
    toast.className = `toast ${event.detail.type || "info"}`;
    toast.textContent = event.detail.message;
    stack.append(toast);
    setTimeout(() => toast.remove(), 2800);
  });
}

export function fallbackImage(id, kind = "poster") {
  const size = kind === "backdrop" ? "1280/720" : "500/750";
  return `https://picsum.photos/seed/netflix-${encodeURIComponent(id)}-${kind}/${size}`;
}

export function setupLazyImages(root = document) {
  const images = [...root.querySelectorAll("img[data-src]")];
  const loadImage = (image) => {
    image.onerror = () => {
      image.onerror = null;
      image.src = fallbackImage(image.dataset.movieId || "fallback", image.dataset.kind || "poster");
    };
    image.src = image.dataset.src;
    image.removeAttribute("data-src");
  };

  if (!("IntersectionObserver" in window)) {
    images.forEach(loadImage);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadImage(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "250px 0px" }
  );

  images.forEach((image) => observer.observe(image));
}

export function setBackgroundWithFallback(element, url, id) {
  if (!element) return;
  const image = new Image();
  image.onload = () => {
    element.style.backgroundImage = `url("${url}")`;
  };
  image.onerror = () => {
    element.style.backgroundImage = `url("${fallbackImage(id, "backdrop")}")`;
  };
  image.src = url;
}

export function setupModal(movies) {
  modalMovies = movies;
  const modal = document.querySelector("[data-modal]");
  if (!modal) return;

  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.closest("[data-modal-close]")) closeMovieModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("open")) closeMovieModal();
  });
}

export function openMovieModal(movie, movies = modalMovies) {
  const modal = document.querySelector("[data-modal]");
  const body = document.querySelector("[data-modal-body]");
  if (!modal || !body || !movie) return;

  const similar = getSimilar(movie, movies, 4);
  const listed = isInMyList(movie.id);
  const reaction = getReaction(movie.id);

  body.innerHTML = `
    <div class="modal-hero">
      <img src="${movie.backdrop}" alt="${escapeHTML(movie.title)} backdrop" onerror="this.src='${fallbackImage(movie.id, "backdrop")}'">
    </div>
    <div class="modal-copy">
      <h2 id="modal-title">${escapeHTML(movie.title)}</h2>
      <div class="modal-meta">
        <span class="match-score">${Math.round(Number(movie.rating) * 10)}% Match</span>
        <span>${escapeHTML(String(movie.year))}</span>
        <span class="age-rating">${escapeHTML(movie.age)}</span>
        <span>${escapeHTML(movie.duration)}</span>
        <span>${escapeHTML(movie.genres.join(" / "))}</span>
      </div>
      <p>${escapeHTML(movie.description)}</p>
      <div class="modal-actions">
        <a class="button button-primary" href="movie.html?id=${encodeURIComponent(movie.id)}" data-ripple>
          ${icon("play")} Play
        </a>
        <button class="button button-secondary" data-modal-list="${movie.id}" data-ripple>
          ${icon(listed ? "check" : "plus")} ${listed ? "In My List" : "Add to List"}
        </button>
        <button class="button button-ghost ${reaction === "like" ? "active" : ""}" data-modal-reaction="like" data-movie-id="${movie.id}" data-ripple>
          ${icon("like")} Like
        </button>
        <button class="button button-ghost ${reaction === "dislike" ? "active" : ""}" data-modal-reaction="dislike" data-movie-id="${movie.id}" data-ripple>
          ${icon("dislike")} Dislike
        </button>
      </div>
      <div class="modal-cast"><strong>Cast:</strong> ${escapeHTML(movie.cast.join(", "))}</div>
      <video class="modal-trailer" controls preload="metadata" poster="${movie.backdrop}">
        <source src="${movie.trailer}" type="video/mp4">
      </video>
    </div>
    <div class="similar-strip">
      ${similar
        .map(
          (item) => `
            <button class="similar-card" data-similar-id="${item.id}" title="${escapeHTML(item.title)}">
              <img src="${item.backdrop}" alt="${escapeHTML(item.title)}" onerror="this.src='${fallbackImage(item.id, "backdrop")}'">
              <span>${escapeHTML(item.title)}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;

  body.querySelector("[data-modal-list]")?.addEventListener("click", (event) => {
    const added = toggleMyList(event.currentTarget.dataset.modalList);
    event.currentTarget.innerHTML = `${icon(added ? "check" : "plus")} ${added ? "In My List" : "Add to List"}`;
  });

  body.querySelectorAll("[data-modal-reaction]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = setReaction(button.dataset.movieId, button.dataset.modalReaction);
      body.querySelectorAll("[data-modal-reaction]").forEach((item) => item.classList.remove("active"));
      if (next) button.classList.add("active");
    });
  });

  body.querySelectorAll("[data-similar-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextMovie = movies.find((item) => item.id === button.dataset.similarId);
      openMovieModal(nextMovie, movies);
    });
  });

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

export function closeMovieModal() {
  const modal = document.querySelector("[data-modal]");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  modal.querySelectorAll("video").forEach((video) => video.pause());
}

export function icon(name) {
  const icons = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
    like: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 21h4V9H2zm20-11c0-1.1-.9-2-2-2h-6.3l1-4.6.1-.3c0-.4-.2-.8-.4-1.1L13.3 1 6.6 7.7C6.2 8.1 6 8.6 6 9.2V19c0 1.1.9 2 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7c.1-.2.2-.5.2-.8z"/></svg>',
    dislike: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 3h-4v12h4zM2 14c0 1.1.9 2 2 2h6.3l-1 4.6-.1.3c0 .4.2.8.4 1.1l1.1 1 6.7-6.7c.4-.4.6-.9.6-1.5V5c0-1.1-.9-2-2-2H7c-.8 0-1.5.5-1.8 1.2l-3 7c-.1.2-.2.5-.2.8z"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 17h2v-6h-2zm0-8h2V7h-2zm1 13a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15.4 7.4-1.4-1.4L8 12l6 6 1.4-1.4L10.8 12z"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8.6 16.6 1.4 1.4 6-6-6-6-1.4 1.4 4.6 4.6z"/></svg>'
  };
  return icons[name] || "";
}

export function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function notifyReady(message) {
  setTimeout(() => showToast(message, "success"), 250);
}
