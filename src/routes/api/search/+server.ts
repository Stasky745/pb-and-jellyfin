import { json } from '@sveltejs/kit';
import { requireSession } from '#lib/server/auth.js';
import { searchLibrary, searchTmdb } from '#lib/server/jellyfin.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const session = requireSession(locals);
	const term = url.searchParams.get('q')?.trim();
	if (!term) return json({ library: [], tmdb: [] });
	const [library, tmdb] = await Promise.all([
		searchLibrary(session, term),
		searchTmdb(session, term).catch(() => [])
	]);
	const inLibrary = new Set(library.map((m) => m.id));
	return json({
		library,
		tmdb: tmdb.filter((m) => !inLibrary.has(m.id)).map(({ imageUrl, ...movie }) => movie)
	});
};
