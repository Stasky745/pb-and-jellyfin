import { json } from '@sveltejs/kit';
import { requireSession } from '#lib/server/auth.js';
import { removeMovie } from '#lib/server/store.js';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = ({ params, locals }) => {
	removeMovie(requireSession(locals).user.id, params.id);
	return json({ ok: true });
};
