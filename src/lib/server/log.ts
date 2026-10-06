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

export const errorFields = (e: unknown) =>
	e instanceof Error ? { error: e.message, stack: e.stack } : { error: String(e) };
