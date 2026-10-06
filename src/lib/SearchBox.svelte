<script lang="ts">
	import SourceList from '#lib/SourceList.svelte';
	import type { Candidate } from '#lib/types.js';

	let { ranked, onadd }: { ranked: Set<string>; onadd: (movie: Candidate) => Promise<void> } = $props();

	let query = $state('');
	let library = $state<Candidate[]>([]);
	let tmdb = $state<Candidate[]>([]);
	let loading = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	function search() {
		clearTimeout(timer);
		timer = setTimeout(async () => {
			const term = query.trim();
			if (!term) {
				library = tmdb = [];
				return;
			}
			loading = true;
			const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
			if (term !== query.trim()) return;
			loading = false;
			if (res.ok) ({ library, tmdb } = await res.json());
		}, 300);
	}

	async function add(movie: Candidate) {
		await onadd(movie);
		query = '';
		library = tmdb = [];
	}
</script>

{#snippet results(title: string, movies: Candidate[])}
	{#if movies.length}
		<h3 class="mt-3 mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{title}</h3>
		<SourceList {movies}>
			{#snippet action(movie: Candidate)}
				{#if ranked.has(movie.id)}
					<span class="px-2 text-sm text-zinc-500">In your list</span>
				{:else}
					<button
						class="cursor-pointer rounded bg-violet-600 px-3 py-1 text-sm hover:bg-violet-500"
						onclick={() => add(movie)}>Add</button
					>
				{/if}
			{/snippet}
		</SourceList>
	{/if}
{/snippet}

<input
	type="search"
	placeholder="Add a movie…"
	bind:value={query}
	oninput={search}
	class="w-full rounded-lg bg-zinc-800 px-4 py-2"
/>
{#if query.trim()}
	<div class="mt-2 max-h-[50vh] overflow-y-auto rounded-lg border border-zinc-800 p-3">
		<p class="text-xs text-zinc-500">Drag a movie into your list, or press Add to place it by comparing.</p>
		{#if loading}
			<p class="mt-2 text-sm text-zinc-500">Searching…</p>
		{:else if !library.length && !tmdb.length}
			<p class="mt-2 text-sm text-zinc-500">No movies found.</p>
		{/if}
		{@render results('In Jellyfin', library)}
		{@render results('Not in Jellyfin', tmdb)}
	</div>
{/if}
