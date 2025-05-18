import axios from 'axios';

export interface Cartoon {
    id: number;
    title: string;
    overview: string;
    poster_path: string;
}

interface TMDBResponse {
    results: Cartoon[];
}

export async function getRandomCartoon(): Promise<Cartoon> {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY;

    const response = await axios.get<TMDBResponse>(
        'https://api.themoviedb.org/3/discover/movie',
        {
            params: {
                api_key: apiKey,
                with_genres: 16,
                language: 'ru',
                include_adult: false,
            },
        }
    );

    const cartoons = response.data.results;
    return cartoons[Math.floor(Math.random() * cartoons.length)];
}
