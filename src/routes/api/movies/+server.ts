import { error, json } from '@sveltejs/kit';
import { requireSession } from '#lib/server/auth.js';
import { fetchItemPoster, getLibraryMovie, getTmdbMovie } from '#lib/server/jellyfin.js';
import { errorFields, log } from '#lib/server/log.js';
import { hasPoster, savePoster } from '#lib/server/posters.js';
import { addMovie, getMovie } from '#lib/server/store.js';
import type { Source } from '#lib/types.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = requireSession(locals);
	const { source, sourceId } = (await request.json()) as { source: Source; sourceId: string };

	let movie, poster: (() => Promise<Response>) | null = null;
	if (source === 'jellyfin') {
		movie = await getLibraryMovie(session, sourceId);
		poster = () => fetchItemPoster(session, sourceId);
	} else if (source === 'tmdb') {
		movie = await getTmdbMovie(session, sourceId);
		const imageUrl = movie?.imageUrl;
		if (imageUrl) poster = () => fetch(imageUrl);
	} else if (source === 'rank') {
		movie = getMovie(sourceId);
	} else {
		error(400, 'Unknown source');
	}
	if (!movie) error(404, 'Movie not found');

	const stored = { id: movie.id, title: movie.title, year: movie.year, overview: movie.overview };
	const added = addMovie(session.user.id, stored);
	if (poster && !hasPoster(movie.id)) {
		await poster()
			.then((res) => savePoster(movie.id, res))
			.catch((e) => log.warn('poster download failed', { movieId: movie.id, ...errorFields(e) }));
	}
	return json({ movie: stored, added });
};
