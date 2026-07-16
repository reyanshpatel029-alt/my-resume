import { getMyList } from "./storage.js";

let catalogCache = null;

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

export async function getCatalog() {
  if (catalogCache) return catalogCache;
  catalogCache = await fetchJson("data/movies.json");
  return catalogCache;
}

export async function getMovies() {
  const catalog = await getCatalog();
  const localMovies = catalog.movies;
  const key = localStorage.getItem("netflix_clone_tmdb_key");
  if (!key) return localMovies;

  try {
    const trending = await fetchTMDBTrending(key);
    return [...localMovies, ...trending].slice(0, 60);
  } catch (error) {
    console.warn("TMDB fallback active", error);
    return localMovies;
  }
}

export async function getCategories() {
  const catalog = await getCatalog();
  return catalog.categories;
}

export async function getMovieById(id) {
  const movies = await getMovies();
  return movies.find((movie) => movie.id === id) || movies[0];
}

export function getFeaturedMovie(movies) {
  const featuredPool = movies.filter((movie) => movie.categories?.includes("trending") || movie.rank);
  return featuredPool[Math.floor(Math.random() * featuredPool.length)] || movies[0];
}

export function getMoviesByCategory(movies, categoryId) {
  if (categoryId === "my-list") {
    const ids = getMyList();
    return movies.filter((movie) => ids.includes(movie.id));
  }
  return movies.filter((movie) => movie.categories?.includes(categoryId));
}

export function getContinueMovies(movies, continueIds = []) {
  const bySavedProgress = continueIds.map((id) => movies.find((movie) => movie.id === id)).filter(Boolean);
  const seeded = movies.filter((movie) => movie.categories?.includes("continue") && !continueIds.includes(movie.id));
  return [...bySavedProgress, ...seeded];
}

export function getSimilar(movie, movies, limit = 8) {
  if (!movie) return [];
  const genreSet = new Set(movie.genres || []);
  return movies
    .filter((item) => item.id !== movie.id)
    .map((item) => ({
      item,
      score: item.genres?.filter((genre) => genreSet.has(genre)).length || 0
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || Number(b.rating) - Number(a.rating))
    .slice(0, limit)
    .map(({ item }) => item);
}

export function filterMovies(movies, { query = "", type = "", category = "", language = "" } = {}) {
  const cleanQuery = query.trim().toLowerCase();
  const myListIds = getMyList();

  return movies.filter((movie) => {
    const searchable = [
      movie.title,
      movie.year,
      movie.type,
      movie.language,
      ...(movie.genres || []),
      ...(movie.cast || [])
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery = cleanQuery ? searchable.includes(cleanQuery) : true;
    const matchesType = type ? movie.type === type : true;
    const matchesLanguage = language && language !== "all" ? movie.language === language : true;
    const matchesCategory = category
      ? category === "my-list"
        ? myListIds.includes(movie.id)
        : movie.categories?.includes(category)
      : true;

    return matchesQuery && matchesType && matchesLanguage && matchesCategory;
  });
}

export function getSuggestions(movies, query = "") {
  const cleanQuery = query.trim().toLowerCase();
  const source = cleanQuery
    ? movies.filter((movie) => movie.title.toLowerCase().includes(cleanQuery) || movie.genres.join(" ").toLowerCase().includes(cleanQuery))
    : movies.slice(0, 8);

  const titleSuggestions = source.slice(0, 5).map((movie) => movie.title);
  const genreSuggestions = [...new Set(source.flatMap((movie) => movie.genres))].slice(0, 5);
  return [...new Set([...titleSuggestions, ...genreSuggestions])].slice(0, 8);
}

export async function fetchOMDbDetails(title) {
  const key = localStorage.getItem("netflix_clone_omdb_key");
  if (!key || !title) return null;
  const url = `https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&t=${encodeURIComponent(title)}`;
  return fetchJson(url);
}

export async function fetchTMDBTrending(apiKey) {
  const url = `https://api.themoviedb.org/3/trending/all/week?api_key=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson(url);
  return (data.results || []).filter((item) => item.poster_path && item.backdrop_path).map(mapTMDBMovie);
}

function mapTMDBMovie(item) {
  const title = item.title || item.name || "Untitled";
  const date = item.release_date || item.first_air_date || "";
  return {
    id: `tmdb-${item.id}`,
    title,
    type: item.media_type === "tv" ? "TV Show" : "Movie",
    year: date ? Number(date.slice(0, 4)) : "New",
    duration: item.media_type === "tv" ? "Series" : "Feature",
    rating: Number(item.vote_average || 0).toFixed(1),
    age: item.adult ? "18+" : "PG-13",
    language: item.original_language?.toUpperCase() || "EN",
    genres: ["Trending"],
    cast: [],
    description: item.overview || "A trending title from TMDB.",
    poster: `${TMDB_IMAGE_BASE}${item.poster_path}`,
    backdrop: `${TMDB_IMAGE_BASE}${item.backdrop_path}`,
    trailer: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    categories: ["trending", "popular"]
  };
}
