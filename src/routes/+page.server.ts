import { requireSession } from '#lib/server/auth.js';
import { watchedMovies } from '#lib/server/jellyfin.js';
import { combined, theirView } from '#lib/server/ranking.js';
import { listRanking, otherUser } from '#lib/server/store.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = requireSession(locals);
	const mine = listRanking(session.user.id);
	const other = otherUser(session.user.id);
	const theirs = other ? listRanking(other.id) : null;
	const ranked = new Set(mine.map((m) => m.id));
	return {
		mine,
		theirs: theirs && theirView(mine, theirs),
		together: theirs && combined(mine, theirs),
		watched: (await watchedMovies(session)).filter((m) => !ranked.has(m.id))
	};
};
