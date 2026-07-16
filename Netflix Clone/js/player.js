import { getMovieById, getMovies, getSimilar } from "./api.js";
import { getProgressDetail, saveProgress, showToast } from "./storage.js";
import { hideLoader, setupModal, setupRevealAnimations, setupRipple, setupToasts, throttle } from "./animations.js";
import { setupNavbar } from "./navbar.js";
import { renderRow, setupCardActions } from "./slider.js";

document.addEventListener("DOMContentLoaded", initPlayer);

async function initPlayer() {
  setupToasts();
  setupRipple();
  setupNavbar();

  try {
    const movies = await getMovies();
    const id = new URLSearchParams(window.location.search).get("id");
    const movie = await getMovieById(id);

    setupModal(movies);
    paintMovie(movie);
    setupVideo(movie);
    renderRow(document.querySelector("#recommended-row"), {
      id: "similar",
      title: "Similar Movies",
      movies: getSimilar(movie, movies, 12)
    });
    setupCardActions(document, movies);
    setupRevealAnimations();
  } catch (error) {
    console.error(error);
  } finally {
    hideLoader();
  }
}

function paintMovie(movie) {
  setText("[data-player-title]", movie.title);
  setText("[data-player-rating]", `${movie.rating} Rating`);
  setText("[data-player-year]", movie.year);
  setText("[data-player-age]", movie.age);
  setText("[data-player-genre]", movie.genres.slice(0, 3).join(" / "));
  setText("[data-player-description]", movie.description);
}

function setupVideo(movie) {
  const shell = document.querySelector("[data-player]");
  const video = document.querySelector("#video-player");
  const source = document.querySelector("[data-video-source]");
  const playToggle = document.querySelector("[data-play-toggle]");
  const progress = document.querySelector("[data-progress]");
  const volume = document.querySelector("[data-volume]");
  const mute = document.querySelector("[data-mute]");
  const speed = document.querySelector("[data-speed]");
  const captions = document.querySelector("[data-captions]");
  const fullscreen = document.querySelector("[data-fullscreen]");
  const time = document.querySelector("[data-time]");
  const playIcon = document.querySelector("[data-play-icon]");
  const saved = getProgressDetail(movie.id);
  const saveWatchProgress = throttle(() => saveProgress(movie.id, video.currentTime, video.duration), 1200);

  video.poster = movie.backdrop;
  source.src = movie.trailer;
  video.load();
  video.volume = Number(volume.value);
  shell.classList.add("is-paused");

  video.addEventListener("loadedmetadata", () => {
    if (saved?.currentTime && saved.currentTime < video.duration - 8) video.currentTime = saved.currentTime;
    updateTime();
  });

  video.addEventListener("play", () => {
    shell.classList.remove("is-paused");
    playIcon.setAttribute("d", "M6 5h4v14H6zm8 0h4v14h-4z");
  });

  video.addEventListener("pause", () => {
    shell.classList.add("is-paused");
    playIcon.setAttribute("d", "M8 5v14l11-7z");
  });

  video.addEventListener("timeupdate", () => {
    updateTime();
    saveWatchProgress();
  });

  playToggle.addEventListener("click", togglePlay);
  video.addEventListener("click", togglePlay);

  progress.addEventListener("input", () => {
    if (Number.isFinite(video.duration)) video.currentTime = (Number(progress.value) / 100) * video.duration;
  });

  volume.addEventListener("input", () => {
    video.volume = Number(volume.value);
    video.muted = video.volume === 0;
  });

  mute.addEventListener("click", () => {
    video.muted = !video.muted;
    showToast(video.muted ? "Muted" : "Volume on", "info");
  });

  speed.addEventListener("change", () => {
    video.playbackRate = Number(speed.value);
  });

  captions.addEventListener("click", () => {
    const track = video.textTracks[0];
    if (!track) return;
    track.mode = track.mode === "showing" ? "hidden" : "showing";
    captions.classList.toggle("active", track.mode === "showing");
  });

  fullscreen.addEventListener("click", toggleFullscreen);

  document.addEventListener("keydown", (event) => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
    if (event.key === " ") {
      event.preventDefault();
      togglePlay();
    }
    if (event.key.toLowerCase() === "f") toggleFullscreen();
    if (event.key.toLowerCase() === "m") video.muted = !video.muted;
    if (event.key === "ArrowRight") video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
    if (event.key === "ArrowLeft") video.currentTime = Math.max(0, video.currentTime - 10);
    if (event.key === "Escape" && document.fullscreenElement) document.exitFullscreen();
  });

  function togglePlay() {
    if (video.paused) video.play();
    else video.pause();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else shell.requestFullscreen?.();
  }

  function updateTime() {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const percent = duration ? (video.currentTime / duration) * 100 : 0;
    progress.value = String(percent);
    time.textContent = `${formatTime(video.currentTime)} / ${formatTime(duration)}`;
  }
}

function formatTime(value) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value ?? "";
}
