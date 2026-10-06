import { error, json } from '@sveltejs/kit';
import { requireSession } from '#lib/server/auth.js';
import { fetchItemPoster, getTmdbMovie } from '#lib/server/jellyfin.js';
import { errorFields, log } from '#lib/server/log.js';
import { hasPoster, savePoster } from '#lib/server/posters.js';
import { getMovie } from '#lib/server/store.js';
import type { RequestHandler } from './$types';

async function download(session: App.Locals['session'] & {}, movieId: string) {
	const [kind, sourceId] = [movieId.slice(0, movieId.indexOf(':')), movieId.slice(movieId.indexOf(':') + 1)];
	if (kind === 'jf') return fetchItemPoster(session, sourceId);
	if (kind === 'tmdb') {
		const imageUrl = (await getTmdbMovie(session, sourceId))?.imageUrl;
		return imageUrl ? fetch(imageUrl) : null;
	}
	return null;
}

export const POST: RequestHandler = async ({ params, locals }) => {
	const session = requireSession(locals);
	if (!getMovie(params.id)) error(404, 'Unknown movie');
	if (hasPoster(params.id)) return json({ ok: true });

	let res: Response | null;
	try {
		res = await download(session, params.id);
	} catch (e) {
		log.warn('poster retry failed', { movieId: params.id, ...errorFields(e) });
		error(502, 'Could not reach the poster source');
	}
	if (!res?.ok) error(404, 'No poster available');
	await savePoster(params.id, res);
	log.info('poster retry succeeded', { movieId: params.id });
	return json({ ok: true });
};
