<script lang="ts">
	import type { Snippet } from 'svelte';
	import { posterVersions, retryPoster } from '#lib/posters.svelte.js';
	import type { Movie } from '#lib/types.js';

	let {
		movie,
		posterUrl,
		rank,
		highlighted = false,
		onhover,
		children
	}: {
		movie: Movie;
		posterUrl?: string | null;
		rank?: number | string;
		highlighted?: boolean;
		onhover?: (id: string | null) => void;
		children?: Snippet;
	} = $props();

	let expanded = $state(false);
	let retrying = $state(false);
	let failedSrc = $state<string | null>(null);

	const stored = $derived(posterUrl === undefined);
	const src = $derived(
		stored ? `/poster/${encodeURIComponent(movie.id)}?v=${posterVersions[movie.id] ?? 0}` : posterUrl
	);
	const posterFailed = $derived(failedSrc !== null && failedSrc === src);

	async function onclick() {
		expanded = !expanded;
		if (!stored || !posterFailed || retrying) return;
		retrying = true;
		await retryPoster(movie.id);
		retrying = false;
	}
</script>

<div
	role="listitem"
	class="group relative flex items-center gap-3 rounded-lg p-2 transition-colors {highlighted
		? 'bg-violet-950 ring-1 ring-violet-500'
		: 'bg-zinc-900'}"
	onmouseenter={() => onhover?.(movie.id)}
	onmouseleave={() => onhover?.(null)}
>
	{#if rank !== undefined}
		<span class="w-7 flex-none text-center text-lg font-bold text-zinc-400">{rank}</span>
	{/if}
	{#if src && !posterFailed}
		<img
			{src}
			alt=""
			loading="lazy"
			draggable="false"
			onerror={() => (failedSrc = src)}
			class="h-18 w-12 flex-none rounded bg-zinc-800 object-cover"
		/>
	{:else}
		<div
			title={stored ? 'No poster — click the card to try again' : undefined}
			class="flex h-18 w-12 flex-none items-center justify-center rounded bg-zinc-800 text-xl text-zinc-600 {retrying
				? 'animate-pulse'
				: ''}"
		>
			🎬
		</div>
	{/if}
	<button type="button" class="min-w-0 flex-1 cursor-pointer text-left" {onclick}>
		<div class="truncate font-medium">{movie.title}</div>
		{#if movie.year}
			<div class="text-sm text-zinc-400">{movie.year}</div>
		{/if}
		{#if expanded && movie.overview}
			<p class="mt-1 text-sm text-zinc-300">{movie.overview}</p>
		{/if}
	</button>
	{@render children?.()}
	{#if movie.overview && !expanded}
		<div
			class="pointer-events-none invisible absolute top-full right-0 left-0 z-10 mt-1 rounded-lg bg-zinc-800 p-3 text-sm text-zinc-200 opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-hover:delay-500"
		>
			{movie.overview}
		</div>
	{/if}
</div>
