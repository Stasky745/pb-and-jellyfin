import { error } from '@sveltejs/kit';

export function requireSession(locals: App.Locals) {
	if (!locals.session) error(401, 'Not logged in');
	return locals.session;
}

export const SESSION_COOKIE = 'session';
