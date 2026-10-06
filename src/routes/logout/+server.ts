import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '#lib/server/auth.js';
import { logout } from '#lib/server/jellyfin.js';
import { deleteSession } from '#lib/server/store.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.session) {
		await logout(locals.session);
		deleteSession(locals.session.id);
	}
	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(303, '/login');
};
