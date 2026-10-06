function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is not set`);
	return value;
}

export const jellyfinUrl = () => required('JELLYFIN_URL').replace(/\/+$/, '');

export const allowedUsers = () =>
	required('ALLOWED_USERS')
		.split(',')
		.map((name) => name.trim().toLowerCase())
		.filter(Boolean);

export const databasePath = () => process.env.DATABASE_PATH ?? './data/rank.db';
