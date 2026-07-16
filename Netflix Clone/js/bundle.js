(function () {
  "use strict";

  var catalog = window.NETFLIX_DATA || { categories: [], movies: [] };
  var page = document.documentElement.dataset.page || "home";
  var prefix = "netflix_clone_";
  var defaultProfiles = [
    { id: "owner", name: "Reyansh", kids: false },
    { id: "guest", name: "Guest", kids: false },
    { id: "kids", name: "Kids", kids: true }
  ];

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    setupToasts();
    setupRipple();
    setupNavbar();

    if (page === "home") initHome();
    if (page === "search") initSearch();
    if (page === "login") initLogin();
    if (page === "profile") initProfile();
    if (page === "movie") initPlayer();

    setupRevealAnimations();
    setTimeout(function () {
      var loader = document.querySelector("[data-loader]");
      if (loader) loader.classList.add("hidden");
    }, 250);
  }

  function initHome() {
    var movies = catalog.movies;
    setupModal(movies);
    setupHero(movies);
    renderRow(document.querySelector("#continue-watching"), {
      id: "continue",
      title: "Continue Watching",
      movies: getContinueMovies(movies).slice(0, 12)
    });

    var rows = document.querySelector("#movie-rows");
    rows.innerHTML = "";
    catalog.categories.forEach(function (category) {
      if (category.id === "continue" || category.id === "my-list") return;
      var rowMovies = getMoviesByCategory(movies, category.id);
      renderRow(rows, {
        id: category.id,
        title: category.title,
        movies: rowMovies,
        showRank: category.id === "top10"
      });
    });

    var myListMovies = getMoviesByCategory(movies, "my-list");
    if (myListMovies.length) renderRow(rows, { id: "my-list", title: "My List", movies: myListMovies });
    setupCardActions(document, movies);
    showToast("Catalog loaded", "success");
  }

  function initSearch() {
    var movies = catalog.movies;
    var input = document.querySelector("#search-input");
    var results = document.querySelector("[data-search-results]");
    var params = new URLSearchParams(window.location.search);
    var filters = {
      type: params.get("type") || "",
      category: params.get("category") || "",
      language: params.get("language") || ""
    };
    var hasFilter = filters.type || filters.category || filters.language;
    input.value = params.has("q") ? params.get("q") : hasFilter ? "" : readStore("last_search", "");

    setupModal(movies);
    setupCardActions(document, movies);
    renderSearch();
    input.addEventListener("input", debounce(renderSearch, 220));
    document.querySelector("[data-suggestions]").addEventListener("click", function (event) {
      var button = event.target.closest("button");
      if (!button) return;
      input.value = button.dataset.suggestion;
      renderSearch();
      input.focus();
    });

    function renderSearch() {
      var query = input.value.trim();
      if (query) writeStore("last_search", query);
      renderSuggestions(movies, query);
      var filtered = filterMovies(movies, Object.assign({ query: query }, filters));
      results.innerHTML = filtered.map(function (movie) {
        return renderMovieCard(movie);
      }).join("");
      setupLazyImages(results);
      document.querySelector("[data-no-results]").hidden = filtered.length > 0;
      document.querySelector("[data-result-count]").textContent = filtered.length + " result" + (filtered.length === 1 ? "" : "s");
      document.querySelector("[data-search-title]").textContent = getSearchTitle(filters, query);
    }
  }

  function initLogin() {
    var form = document.querySelector("[data-login-form]");
    var email = form.elements.email;
    var password = form.elements.password;
    var remember = form.elements.remember;
    var savedEmail = readStore("remembered_email", "");
    if (savedEmail) {
      email.value = savedEmail;
      remember.checked = true;
    }

    document.querySelector("[data-toggle-password]").addEventListener("click", function (event) {
      var visible = password.type === "text";
      password.type = visible ? "password" : "text";
      event.currentTarget.textContent = visible ? "Show" : "Hide";
    });
    document.querySelector("[data-forgot]").addEventListener("click", function () {
      showToast("Password reset link sent", "success");
    });
    document.querySelector("[data-signup]").addEventListener("click", function () {
      showToast("Demo account created", "success");
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      setError("email", "");
      setError("password", "");
      var validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      var validPassword = password.value.trim().length >= 6;
      if (!validEmail) setError("email", "Enter a valid email address.");
      if (!validPassword) setError("password", "Password must be at least 6 characters.");
      if (!validEmail || !validPassword) return;
      writeStore("remembered_email", remember.checked ? email.value.trim() : "");
      writeStore("auth_user", { email: email.value.trim(), signedInAt: Date.now() });
      showToast("Signed in", "success");
      setTimeout(function () {
        window.location.href = "profile.html";
      }, 650);
    });
  }

  function initProfile() {
    var manageMode = false;
    var grid = document.querySelector("[data-profiles]");
    var manageButton = document.querySelector("[data-manage-profiles]");

    renderProfiles();
    document.querySelector("[data-add-profile]").addEventListener("click", function () {
      var name = prompt("Profile name");
      if (!name || !name.trim()) return;
      var kids = confirm("Is this a kids profile?");
      var profiles = getProfiles();
      profiles.push({
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now(),
        name: name.trim(),
        kids: kids
      });
      writeStore("profiles", profiles);
      showToast("Profile updated", "success");
      renderProfiles();
    });
    manageButton.addEventListener("click", function () {
      manageMode = !manageMode;
      manageButton.textContent = manageMode ? "Done" : "Manage Profiles";
      renderProfiles();
    });

    function renderProfiles() {
      var profiles = getProfiles();
      var active = getActiveProfile();
      grid.innerHTML = profiles.map(function (profile) {
        return '<button class="profile-card ' + (profile.kids ? "kids " : "") + (active.id === profile.id ? "active" : "") + '" data-profile-id="' + profile.id + '">' +
          '<span class="avatar-tile">' + escapeHTML(profile.name[0].toUpperCase()) + '</span>' +
          '<span class="profile-name">' + escapeHTML(profile.name) + (manageMode ? '<span class="remove-profile" data-remove-profile="' + profile.id + '">&times;</span>' : "") + '</span>' +
          "</button>";
      }).join("");
    }

    grid.addEventListener("click", function (event) {
      var removeButton = event.target.closest("[data-remove-profile]");
      if (removeButton) {
        event.stopPropagation();
        var nextProfiles = getProfiles().filter(function (profile) {
          return profile.id !== removeButton.dataset.removeProfile;
        });
        if (!nextProfiles.length) return showToast("Keep at least one profile", "warning");
        writeStore("profiles", nextProfiles);
        writeStore("active_profile", nextProfiles[0]);
        showToast("Profile updated", "success");
        renderProfiles();
        return;
      }

      var card = event.target.closest("[data-profile-id]");
      if (!card || manageMode) return;
      var profile = getProfiles().find(function (item) {
        return item.id === card.dataset.profileId;
      });
      writeStore("active_profile", profile);
      showToast(profile.name + " selected", "success");
      setTimeout(function () {
        window.location.href = "index.html";
      }, 520);
    });
  }

  function initPlayer() {
    var movies = catalog.movies;
    var id = new URLSearchParams(window.location.search).get("id");
    var movie = getMovieById(id);
    setupModal(movies);
    setText("[data-player-title]", movie.title);
    setText("[data-player-rating]", movie.rating + " Rating");
    setText("[data-player-year]", movie.year);
    setText("[data-player-age]", movie.age);
    setText("[data-player-genre]", movie.genres.slice(0, 3).join(" / "));
    setText("[data-player-description]", movie.description);
    setupVideo(movie);
    renderRow(document.querySelector("#recommended-row"), {
      id: "similar",
      title: "Similar Movies",
      movies: getSimilar(movie, movies, 12)
    });
    setupCardActions(document, movies);
  }

  function setupNavbar() {
    var activeProfile = getActiveProfile();
    document.querySelectorAll("[data-active-avatar]").forEach(function (avatar) {
      avatar.textContent = activeProfile.name[0].toUpperCase();
    });

    var toggle = document.querySelector("[data-mobile-toggle]");
    var menu = document.querySelector("[data-nav-menu]");
    if (toggle && menu) {
      toggle.addEventListener("click", function () {
        var open = !menu.classList.contains("open");
        toggle.classList.toggle("open", open);
        menu.classList.toggle("open", open);
      });
    }

    var navbar = document.querySelector("[data-navbar]");
    if (navbar) {
      window.addEventListener("scroll", throttle(function () {
        navbar.classList.toggle("scrolled", window.scrollY > 12);
      }, 80), { passive: true });
    }

    document.querySelector("[data-notifications]")?.addEventListener("click", function () {
      showToast("No new notifications", "info");
    });
  }

  function setupHero(movies) {
    var movie = getFeaturedMovie(movies);
    var backdrop = document.querySelector("[data-hero-backdrop]");
    var poster = document.querySelector("[data-hero-poster]");
    var playButton = document.querySelector("[data-hero-play]");
    var moreButton = document.querySelector("[data-hero-more]");

    paint(movie);
    playButton.addEventListener("click", function () {
      window.location.href = "movie.html?id=" + encodeURIComponent(movie.id);
    });
    moreButton.addEventListener("click", function () {
      openMovieModal(movie, movies);
    });
    setInterval(function () {
      movie = getFeaturedMovie(movies);
      paint(movie);
    }, 8500);

    function paint(nextMovie) {
      backdrop.style.backgroundImage = 'url("' + nextMovie.backdrop + '")';
      setText("[data-hero-type]", nextMovie.type);
      setText("[data-hero-title]", nextMovie.title);
      setText("[data-hero-description]", nextMovie.description);
      setText("[data-hero-rating]", nextMovie.rating + " Rating");
      setText("[data-hero-year]", nextMovie.year);
      setText("[data-hero-age]", nextMovie.age);
      setText("[data-hero-genre]", nextMovie.genres.slice(0, 3).join(" / "));
      if (poster) {
        poster.src = nextMovie.poster;
        poster.alt = nextMovie.title + " poster";
      }
    }
  }

  function renderRow(container, options) {
    if (!container || !options.movies || !options.movies.length) return;
    var section = document.createElement("section");
    section.className = "movie-row reveal";
    section.innerHTML =
      '<div class="section-heading"><h2>' + escapeHTML(options.title) + '</h2><span>' + options.movies.length + ' titles</span></div>' +
      '<div class="row-shell">' +
      '<button class="slider-arrow left" data-slide="left" aria-label="Scroll left">' + icon("left") + '</button>' +
      '<div class="movie-slider" data-slider>' + options.movies.map(function (movie, index) {
        return renderMovieCard(movie, { showRank: options.showRank, index: index });
      }).join("") + '</div>' +
      '<button class="slider-arrow right" data-slide="right" aria-label="Scroll right">' + icon("right") + '</button>' +
      '</div>';
    container.append(section);
    setupSlider(section);
    setupLazyImages(section);
  }

  function renderMovieCard(movie, options) {
    options = options || {};
    var listed = getMyList().indexOf(movie.id) !== -1;
    var reaction = readStore("reactions", {})[movie.id] || "";
    var progress = getProgress(movie.id, movie.progress || 0);
    return '<article class="movie-card zoom-in" data-movie-id="' + movie.id + '">' +
      '<div class="poster-wrap">' +
      '<img data-src="' + movie.poster + '" alt="' + escapeHTML(movie.title) + ' poster" loading="lazy">' +
      (options.showRank ? '<span class="rank-badge">' + (movie.rank || options.index + 1) + '</span>' : "") +
      (progress ? '<div class="progress-bar"><span style="--progress:' + progress + '%"></span></div>' : "") +
      '</div>' +
      '<div class="card-body">' +
      '<h3 class="card-title">' + escapeHTML(movie.title) + '</h3>' +
      '<div class="card-meta"><span class="match-score">' + Math.round(Number(movie.rating) * 10) + '% Match</span><span>' + movie.year + '</span><span>' + escapeHTML(movie.duration) + '</span><span>' + escapeHTML(movie.age) + '</span></div>' +
      '<div class="card-genres">' + escapeHTML(movie.genres.slice(0, 3).join(" / ")) + '</div>' +
      '<div class="card-actions">' +
      '<button class="icon-button primary" data-action="play" title="Play" data-ripple>' + icon("play") + '</button>' +
      '<button class="icon-button ' + (listed ? "active" : "") + '" data-action="list" title="My List" data-ripple>' + icon(listed ? "check" : "plus") + '</button>' +
      '<button class="icon-button ' + (reaction === "like" ? "liked active" : "") + '" data-action="like" title="Like" data-ripple>' + icon("like") + '</button>' +
      '<button class="icon-button ' + (reaction === "dislike" ? "disliked active" : "") + '" data-action="dislike" title="Dislike" data-ripple>' + icon("dislike") + '</button>' +
      '<button class="icon-button" data-action="more" title="More Info" data-ripple>' + icon("info") + '</button>' +
      '</div></div></article>';
  }

  function setupCardActions(root, movies) {
    root.addEventListener("click", function (event) {
      var button = event.target.closest("[data-action]");
      if (!button) return;
      var card = button.closest("[data-movie-id]");
      var movie = movies.find(function (item) {
        return item.id === card.dataset.movieId;
      });
      if (!movie) return;
      if (button.dataset.action === "play") window.location.href = "movie.html?id=" + encodeURIComponent(movie.id);
      if (button.dataset.action === "more") openMovieModal(movie, movies);
      if (button.dataset.action === "list") {
        toggleMyList(movie.id);
        button.innerHTML = icon(getMyList().indexOf(movie.id) !== -1 ? "check" : "plus");
        button.classList.toggle("active", getMyList().indexOf(movie.id) !== -1);
      }
      if (button.dataset.action === "like" || button.dataset.action === "dislike") {
        setReaction(movie.id, button.dataset.action);
        location.reload();
      }
    });
  }

  function setupSlider(section) {
    var slider = section.querySelector("[data-slider]");
    section.querySelectorAll("[data-slide]").forEach(function (button) {
      button.addEventListener("click", function () {
        var direction = button.dataset.slide === "left" ? -1 : 1;
        slider.scrollBy({ left: slider.clientWidth * 0.86 * direction, behavior: "smooth" });
      });
    });
  }

  function openMovieModal(movie, movies) {
    var modal = document.querySelector("[data-modal]");
    var body = document.querySelector("[data-modal-body]");
    if (!modal || !body) return;
    var similar = getSimilar(movie, movies, 4);
    body.innerHTML =
      '<div class="modal-hero"><img src="' + movie.backdrop + '" alt="' + escapeHTML(movie.title) + '"></div>' +
      '<div class="modal-copy">' +
      '<h2 id="modal-title">' + escapeHTML(movie.title) + '</h2>' +
      '<div class="modal-meta"><span class="match-score">' + Math.round(Number(movie.rating) * 10) + '% Match</span><span>' + movie.year + '</span><span class="age-rating">' + movie.age + '</span><span>' + movie.duration + '</span><span>' + escapeHTML(movie.genres.join(" / ")) + '</span></div>' +
      '<p>' + escapeHTML(movie.description) + '</p>' +
      '<div class="modal-actions"><a class="button button-primary" href="movie.html?id=' + encodeURIComponent(movie.id) + '">' + icon("play") + ' Play</a><button class="button button-secondary" data-modal-list="' + movie.id + '">' + icon("plus") + ' My List</button></div>' +
      '<div class="modal-cast"><strong>Cast:</strong> ' + escapeHTML(movie.cast.join(", ")) + '</div>' +
      '<video class="modal-trailer" controls preload="metadata" poster="' + movie.backdrop + '"><source src="' + movie.trailer + '" type="video/mp4"></video>' +
      '</div>' +
      '<div class="similar-strip">' + similar.map(function (item) {
        return '<button class="similar-card" data-similar-id="' + item.id + '"><img src="' + item.backdrop + '" alt="' + escapeHTML(item.title) + '"><span>' + escapeHTML(item.title) + '</span></button>';
      }).join("") + '</div>';
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    body.querySelector("[data-modal-list]")?.addEventListener("click", function () {
      toggleMyList(movie.id);
    });
    body.querySelectorAll("[data-similar-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        openMovieModal(getMovieById(button.dataset.similarId), movies);
      });
    });
  }

  function setupModal(movies) {
    var modal = document.querySelector("[data-modal]");
    if (!modal) return;
    modal.addEventListener("click", function (event) {
      if (event.target === modal || event.target.closest("[data-modal-close]")) {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        modal.querySelectorAll("video").forEach(function (video) {
          video.pause();
        });
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") modal.classList.remove("open");
    });
  }

  function setupVideo(movie) {
    var shell = document.querySelector("[data-player]");
    var video = document.querySelector("#video-player");
    var source = document.querySelector("[data-video-source]");
    var playIcon = document.querySelector("[data-play-icon]");
    var progress = document.querySelector("[data-progress]");
    var time = document.querySelector("[data-time]");
    var volume = document.querySelector("[data-volume]");
    var saved = readStore("watch_progress", {})[movie.id];
    source.src = movie.trailer;
    video.poster = movie.backdrop;
    video.load();
    shell.classList.add("is-paused");

    video.addEventListener("loadedmetadata", function () {
      if (saved && saved.currentTime < video.duration - 8) video.currentTime = saved.currentTime;
      updateTime();
    });
    video.addEventListener("play", function () {
      shell.classList.remove("is-paused");
      playIcon.setAttribute("d", "M6 5h4v14H6zm8 0h4v14h-4z");
    });
    video.addEventListener("pause", function () {
      shell.classList.add("is-paused");
      playIcon.setAttribute("d", "M8 5v14l11-7z");
    });
    video.addEventListener("timeupdate", throttle(function () {
      updateTime();
      saveProgress(movie.id, video.currentTime, video.duration);
    }, 800));
    document.querySelector("[data-play-toggle]").addEventListener("click", togglePlay);
    video.addEventListener("click", togglePlay);
    progress.addEventListener("input", function () {
      video.currentTime = (Number(progress.value) / 100) * video.duration;
    });
    volume.addEventListener("input", function () {
      video.volume = Number(volume.value);
    });
    document.querySelector("[data-mute]").addEventListener("click", function () {
      video.muted = !video.muted;
    });
    document.querySelector("[data-speed]").addEventListener("change", function (event) {
      video.playbackRate = Number(event.target.value);
    });
    document.querySelector("[data-captions]").addEventListener("click", function (event) {
      var track = video.textTracks[0];
      if (!track) return;
      track.mode = track.mode === "showing" ? "hidden" : "showing";
      event.currentTarget.classList.toggle("active", track.mode === "showing");
    });
    document.querySelector("[data-fullscreen]").addEventListener("click", function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else shell.requestFullscreen?.();
    });
    document.addEventListener("keydown", function (event) {
      if (["INPUT", "TEXTAREA", "SELECT"].indexOf(document.activeElement.tagName) !== -1) return;
      if (event.key === " ") {
        event.preventDefault();
        togglePlay();
      }
      if (event.key.toLowerCase() === "f") shell.requestFullscreen?.();
      if (event.key.toLowerCase() === "m") video.muted = !video.muted;
      if (event.key === "ArrowRight") video.currentTime += 10;
      if (event.key === "ArrowLeft") video.currentTime -= 10;
    });

    function togglePlay() {
      if (video.paused) video.play();
      else video.pause();
    }

    function updateTime() {
      var duration = Number.isFinite(video.duration) ? video.duration : 0;
      progress.value = duration ? String((video.currentTime / duration) * 100) : "0";
      time.textContent = formatTime(video.currentTime) + " / " + formatTime(duration);
    }
  }

  function renderSuggestions(movies, query) {
    var container = document.querySelector("[data-suggestions]");
    var source = query ? filterMovies(movies, { query: query }) : movies.slice(0, 8);
    var suggestions = Array.from(new Set(source.slice(0, 5).map(function (movie) {
      return movie.title;
    }).concat(source.flatMap(function (movie) {
      return movie.genres;
    }).slice(0, 5))));
    container.innerHTML = suggestions.map(function (suggestion) {
      return '<button type="button" data-suggestion="' + escapeHTML(suggestion) + '">' + escapeHTML(suggestion) + '</button>';
    }).join("");
  }

  function filterMovies(movies, filters) {
    var list = getMyList();
    var query = (filters.query || "").toLowerCase();
    return movies.filter(function (movie) {
      var text = [movie.title, movie.year, movie.type, movie.language].concat(movie.genres, movie.cast).join(" ").toLowerCase();
      return (!query || text.indexOf(query) !== -1) &&
        (!filters.type || movie.type === filters.type) &&
        (!filters.language || filters.language === "all" || movie.language === filters.language) &&
        (!filters.category || (filters.category === "my-list" ? list.indexOf(movie.id) !== -1 : movie.categories.indexOf(filters.category) !== -1));
    });
  }

  function getSearchTitle(filters, query) {
    if (query) return 'Results for "' + query + '"';
    if (filters.type) return filters.type === "Movie" ? "Movies" : "TV Shows";
    if (filters.category) {
      var category = catalog.categories.find(function (item) {
        return item.id === filters.category;
      });
      return category ? category.title : "Search Results";
    }
    if (filters.language) return "Browse by Language";
    return "Search Results";
  }

  function getFeaturedMovie(movies) {
    var pool = movies.filter(function (movie) {
      return movie.categories.indexOf("trending") !== -1 || movie.rank;
    });
    return pool[Math.floor(Math.random() * pool.length)] || movies[0];
  }

  function getMovieById(id) {
    return catalog.movies.find(function (movie) {
      return movie.id === id;
    }) || catalog.movies[0];
  }

  function getMoviesByCategory(movies, categoryId) {
    if (categoryId === "my-list") {
      var list = getMyList();
      return movies.filter(function (movie) {
        return list.indexOf(movie.id) !== -1;
      });
    }
    return movies.filter(function (movie) {
      return movie.categories.indexOf(categoryId) !== -1;
    });
  }

  function getContinueMovies(movies) {
    var saved = readStore("watch_progress", {});
    var savedIds = Object.keys(saved).sort(function (a, b) {
      return saved[b].updatedAt - saved[a].updatedAt;
    });
    var savedMovies = savedIds.map(getMovieById);
    var seeded = movies.filter(function (movie) {
      return movie.categories.indexOf("continue") !== -1 && savedIds.indexOf(movie.id) === -1;
    });
    return savedMovies.concat(seeded);
  }

  function getSimilar(movie, movies, limit) {
    var genres = new Set(movie.genres);
    return movies.filter(function (item) {
      return item.id !== movie.id && item.genres.some(function (genre) {
        return genres.has(genre);
      });
    }).slice(0, limit);
  }

  function setupRevealAnimations() {
    document.querySelectorAll(".reveal").forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  function setupLazyImages(root) {
    (root || document).querySelectorAll("img[data-src]").forEach(function (image) {
      image.src = image.dataset.src;
      image.removeAttribute("data-src");
    });
  }

  function setupRipple() {
    document.addEventListener("click", function (event) {
      var target = event.target.closest("[data-ripple]");
      if (!target) return;
      var rect = target.getBoundingClientRect();
      var ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.left = event.clientX - rect.left + "px";
      ripple.style.top = event.clientY - rect.top + "px";
      target.append(ripple);
      setTimeout(function () {
        ripple.remove();
      }, 560);
    });
  }

  function setupToasts() {
    document.addEventListener("app:toast", function (event) {
      var stack = document.querySelector("[data-toast-stack]");
      if (!stack) return;
      var toast = document.createElement("div");
      toast.className = "toast " + (event.detail.type || "info");
      toast.textContent = event.detail.message;
      stack.append(toast);
      setTimeout(function () {
        toast.remove();
      }, 2800);
    });
  }

  function showToast(message, type) {
    document.dispatchEvent(new CustomEvent("app:toast", { detail: { message: message, type: type || "info" } }));
  }

  function getProfiles() {
    var profiles = readStore("profiles", null);
    if (Array.isArray(profiles) && profiles.length) return profiles;
    writeStore("profiles", defaultProfiles);
    return defaultProfiles;
  }

  function getActiveProfile() {
    var active = readStore("active_profile", null);
    return getProfiles().find(function (profile) {
      return active && profile.id === active.id;
    }) || getProfiles()[0];
  }

  function getMyList() {
    return readStore("my_list", []);
  }

  function toggleMyList(movieId) {
    var list = getMyList();
    var exists = list.indexOf(movieId) !== -1;
    writeStore("my_list", exists ? list.filter(function (id) {
      return id !== movieId;
    }) : list.concat(movieId));
    showToast(exists ? "Movie removed" : "Movie added", exists ? "warning" : "success");
  }

  function setReaction(movieId, reaction) {
    var reactions = readStore("reactions", {});
    reactions[movieId] = reactions[movieId] === reaction ? null : reaction;
    if (!reactions[movieId]) delete reactions[movieId];
    writeStore("reactions", reactions);
    showToast("Reaction saved", "success");
  }

  function getProgress(movieId, fallback) {
    var progress = readStore("watch_progress", {});
    return progress[movieId] ? progress[movieId].percent : fallback || 0;
  }

  function saveProgress(movieId, currentTime, duration) {
    if (!Number.isFinite(duration) || duration <= 0) return;
    var progress = readStore("watch_progress", {});
    progress[movieId] = {
      currentTime: currentTime,
      duration: duration,
      percent: Math.min(99, Math.round((currentTime / duration) * 100)),
      updatedAt: Date.now()
    };
    writeStore("watch_progress", progress);
  }

  function readStore(key, fallback) {
    try {
      var value = localStorage.getItem(prefix + key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStore(key, value) {
    try {
      localStorage.setItem(prefix + key, JSON.stringify(value));
    } catch (error) {
      console.warn("Storage failed", error);
    }
  }

  function setError(name, message) {
    var error = document.querySelector('[data-error="' + name + '"]');
    if (error) error.textContent = message;
  }

  function setText(selector, value) {
    var element = document.querySelector(selector);
    if (element) element.textContent = value == null ? "" : value;
  }

  function formatTime(value) {
    var minutes = Math.floor(value / 60);
    var seconds = String(Math.floor(value % 60)).padStart(2, "0");
    return minutes + ":" + seconds;
  }

  function debounce(callback, delay) {
    var timer;
    return function () {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        callback.apply(null, args);
      }, delay);
    };
  }

  function throttle(callback, wait) {
    var waiting = false;
    return function () {
      if (waiting) return;
      waiting = true;
      callback.apply(null, arguments);
      setTimeout(function () {
        waiting = false;
      }, wait);
    };
  }

  function icon(name) {
    var icons = {
      play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
      plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
      check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
      like: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 21h4V9H2zm20-11c0-1.1-.9-2-2-2h-6.3l1-4.6.1-.3c0-.4-.2-.8-.4-1.1L13.3 1 6.6 7.7C6.2 8.1 6 8.6 6 9.2V19c0 1.1.9 2 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7c.1-.2.2-.5.2-.8z"/></svg>',
      dislike: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 3h-4v12h4zM2 14c0 1.1.9 2 2 2h6.3l-1 4.6-.1.3c0 .4.2.8.4 1.1l1.1 1 6.7-6.7c.4-.4.6-.9.6-1.5V5c0-1.1-.9-2-2-2H7c-.8 0-1.5.5-1.8 1.2l-3 7c-.1.2-.2.5-.2.8z"/></svg>',
      info: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 17h2v-6h-2zm0-8h2V7h-2zm1 13a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/></svg>',
      left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15.4 7.4-1.4-1.4L8 12l6 6 1.4-1.4L10.8 12z"/></svg>',
      right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8.6 16.6 1.4 1.4 6-6-6-6-1.4 1.4 4.6 4.6z"/></svg>'
    };
    return icons[name] || "";
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
