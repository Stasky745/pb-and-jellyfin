import { requireSession } from '#lib/server/auth.js';
import { fetchItemPoster } from '#lib/server/jellyfin.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const res = await fetchItemPoster(requireSession(locals), params.itemId);
	if (!res.ok) return new Response(null, { status: 404 });
	return new Response(res.body, {
		headers: {
			'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
			'Cache-Control': 'private, max-age=604800'
		}
	});
};
