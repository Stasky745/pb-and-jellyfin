import { error } from '@sveltejs/kit';
import { readPoster } from '#lib/server/posters.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const poster = await readPoster(params.id);
	if (!poster) error(404, 'No poster');
	return new Response(new Uint8Array(poster), {
		headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=604800' }
	});
};
