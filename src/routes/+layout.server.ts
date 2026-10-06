import { otherUser } from '#lib/server/store.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.session) return { me: null, other: null };
	return { me: locals.session.user, other: otherUser(locals.session.user.id) };
};
