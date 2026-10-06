type Level = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = () => levels[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? levels.info;

function write(level: Level, msg: string, fields: Record<string, unknown> = {}) {
	if (levels[level] < threshold()) return;
	const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields });
	(level === 'error' ? process.stderr : process.stdout).write(line + '\n');
}

export const log = {
	debug: (msg: string, fields?: Record<string, unknown>) => write('debug', msg, fields),
	info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
	warn: (msg: string, fields?: Record<string, unknown>) => write('warn', msg, fields),
	error: (msg: string, fields?: Record<string, unknown>) => write('error', msg, fields)
};

function describe(e: unknown): Record<string, unknown> {
	if (!(e instanceof Error)) return { message: String(e) };
	const code = (e as Error & { code?: string }).code;
	return { message: e.message, ...(code && { code }), ...(e.cause !== undefined && { cause: describe(e.cause) }) };
}

// fetch() only says "fetch failed"; the network reason (ENOTFOUND, ECONNREFUSED, ...) is in `cause`.
export const errorFields = (e: unknown) =>
	e instanceof Error
		? { error: e.message, ...(e.cause !== undefined && { cause: describe(e.cause) }), stack: e.stack }
		: { error: String(e) };
