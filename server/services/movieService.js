const axios = require('axios');
const TMDB_URL = 'https://api.themoviedb.org/3/discover/movie';

async function fetchRandomCartoon(age = 5, seenIds = [], dislikedIds = []) {
  const effectiveAge = Math.min(age + 2, 12);
  const randomPage = Math.floor(Math.random() * 5) + 1;

  const res = await axios.get(TMDB_URL, {
    params: {
      api_key: process.env.TMDB_API_KEY,
      with_genres: 16,
      language: 'ru',
      include_adult: false,
      'vote_average.gte': 5,
      page: randomPage,
    },
  });

  const all = res.data.results;

  const filtered = all.filter(
    (c) => !seenIds.includes(c.id) && !dislikedIds.includes(c.id)
  );

  const usable = filtered.length ? filtered : all;

  return usable[Math.floor(Math.random() * usable.length)];
}

async function fetchMovieDetails(id) {
  const res = await axios.get(`https://api.themoviedb.org/3/movie/${id}`, {
    params: {
      api_key: process.env.TMDB_API_KEY,
      language: 'ru',
    },
  });

  return res.data;
}

module.exports = {
  fetchRandomCartoon,
  fetchMovieDetails,
};