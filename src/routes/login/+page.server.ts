import { fail, redirect } from '@sveltejs/kit';
import { SESSION_COOKIE } from '#lib/server/auth.js';
import { APP_NAME } from '#lib/app.js';
import { allowedUsers } from '#lib/server/config.js';
import { authenticate } from '#lib/server/jellyfin.js';
import { log } from '#lib/server/log.js';
import { metrics } from '#lib/server/metrics.js';
import { createSession, upsertUser } from '#lib/server/store.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.session) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!allowedUsers().includes(username.toLowerCase())) {
			metrics.logins.inc({ result: 'not_allowed' });
			log.warn('login rejected: user not allowed', { username });
			return fail(403, { username, error: `This Jellyfin user is not allowed to use ${APP_NAME}.` });
		}
		const result = await authenticate(username, password);
		if (!result) {
			metrics.logins.inc({ result: 'bad_credentials' });
			log.warn('login failed', { username });
			return fail(400, { username, error: 'Wrong username or password.' });
		}
		metrics.logins.inc({ result: 'success' });
		log.info('login', { username: result.user.name });

		upsertUser(result.user);
		cookies.set(SESSION_COOKIE, createSession(result.user.id, result.token), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 365
		});
		redirect(303, '/');
	}
};
