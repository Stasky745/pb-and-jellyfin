import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { databasePath } from './config';

let db: DatabaseSync | undefined;

export function getDb(): DatabaseSync {
	if (db) return db;
	const path = databasePath();
	mkdirSync(dirname(path), { recursive: true });
	db = new DatabaseSync(path);
	db.exec(`
		PRAGMA journal_mode = WAL;
		PRAGMA foreign_keys = ON;
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL
		);
		CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id),
			jellyfin_token TEXT NOT NULL,
			created_at INTEGER NOT NULL
		);
		CREATE TABLE IF NOT EXISTS movies (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			year INTEGER,
			overview TEXT
		);
		CREATE TABLE IF NOT EXISTS rankings (
			user_id TEXT NOT NULL REFERENCES users(id),
			movie_id TEXT NOT NULL REFERENCES movies(id),
			position INTEGER NOT NULL,
			PRIMARY KEY (user_id, movie_id)
		);
	`);
	migrate(db);
	return db;
}

function migrate(db: DatabaseSync) {
	const { user_version } = db.prepare('PRAGMA user_version').get() as { user_version: number };
	if (user_version < 1) {
		// v1 switched movie ids from Jellyfin item ids to tmdb:/jf: ids; old rows were re-added by hand.
		db.exec('DELETE FROM rankings; DELETE FROM movies; PRAGMA user_version = 1;');
	}
}

export function transaction<T>(fn: () => T): T {
	const db = getDb();
	db.exec('BEGIN');
	try {
		const result = fn();
		db.exec('COMMIT');
		return result;
	} catch (e) {
		db.exec('ROLLBACK');
		throw e;
	}
}
