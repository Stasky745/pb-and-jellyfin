import { error, json } from '@sveltejs/kit';
import { requireSession } from '#lib/server/auth.js';
import { setOrder } from '#lib/server/store.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = requireSession(locals);
	const { ids } = await request.json();
	if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) error(400, 'ids must be a list of strings');
	if (!setOrder(session.user.id, ids)) error(409, 'List changed, reload and try again');
	return json({ ok: true });
};
