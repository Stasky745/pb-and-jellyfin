import { randomBytes } from 'node:crypto';
import type { Movie } from '#lib/types.js';
import { allowedUsers } from './config';
import { getDb, transaction } from './db';

export type User = { id: string; name: string };
export type Session = { id: string; token: string; user: User };

const isAllowed = (name: string) => allowedUsers().includes(name.toLowerCase());

export function upsertUser(user: User) {
	getDb()
		.prepare('INSERT INTO users (id, name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name')
		.run(user.id, user.name);
}

export function createSession(userId: string, token: string): string {
	const id = randomBytes(32).toString('base64url');
	getDb()
		.prepare('INSERT INTO sessions (id, user_id, jellyfin_token, created_at) VALUES (?, ?, ?, ?)')
		.run(id, userId, token, Date.now());
	return id;
}

export function getSession(id: string): Session | null {
	const row = getDb()
		.prepare(
			`SELECT s.id, s.jellyfin_token AS token, u.id AS user_id, u.name AS user_name
			FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`
		)
		.get(id) as { id: string; token: string; user_id: string; user_name: string } | undefined;
	if (!row || !isAllowed(row.user_name)) return null;
	return { id: row.id, token: row.token, user: { id: row.user_id, name: row.user_name } };
}

export function deleteSession(id: string) {
	getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function otherUser(userId: string): User | null {
	const users = getDb().prepare('SELECT id, name FROM users WHERE id != ?').all(userId) as User[];
	return users.find((u) => isAllowed(u.name)) ?? null;
}

export function listRanking(userId: string): Movie[] {
	return getDb()
		.prepare(
			`SELECT m.id, m.title, m.year, m.overview
			FROM rankings r JOIN movies m ON m.id = r.movie_id
			WHERE r.user_id = ? ORDER BY r.position`
		)
		.all(userId) as Movie[];
}

export function getMovie(id: string): Movie | null {
	return (getDb().prepare('SELECT id, title, year, overview FROM movies WHERE id = ?').get(id) as Movie) ?? null;
}

export function addMovie(userId: string, movie: Movie): boolean {
	return transaction(() => {
		const db = getDb();
		db.prepare(
			`INSERT INTO movies (id, title, year, overview) VALUES (?, ?, ?, ?)
			ON CONFLICT(id) DO UPDATE SET
				title = excluded.title,
				year = COALESCE(excluded.year, year),
				overview = COALESCE(excluded.overview, overview)`
		).run(movie.id, movie.title, movie.year, movie.overview);
		const { changes } = db
			.prepare(
				`INSERT INTO rankings (user_id, movie_id, position)
				SELECT ?, ?, COALESCE(MAX(position), -1) + 1 FROM rankings WHERE user_id = ?
				ON CONFLICT DO NOTHING`
			)
			.run(userId, movie.id, userId);
		return changes > 0;
	});
}

export function removeMovie(userId: string, movieId: string) {
	getDb().prepare('DELETE FROM rankings WHERE user_id = ? AND movie_id = ?').run(userId, movieId);
}

export function setOrder(userId: string, movieIds: string[]): boolean {
	return transaction(() => {
		const db = getDb();
		const current = new Set(listRanking(userId).map((m) => m.id));
		if (current.size !== movieIds.length || !movieIds.every((id) => current.has(id))) return false;
		const update = db.prepare('UPDATE rankings SET position = ? WHERE user_id = ? AND movie_id = ?');
		movieIds.forEach((id, position) => update.run(position, userId, id));
		return true;
	});
}
