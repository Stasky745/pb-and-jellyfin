<script lang="ts">
	import { flip } from 'svelte/animate';
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import { invalidateAll } from '$app/navigation';
	import MovieCard from '#lib/MovieCard.svelte';
	import PlaceMovie from '#lib/PlaceMovie.svelte';
	import SearchBox from '#lib/SearchBox.svelte';
	import SourceList from '#lib/SourceList.svelte';
	import { dndOptions, flipDurationMs } from '#lib/dnd.js';
	import { isDraggableCandidate, type Candidate, type DraggableCandidate, type Movie, type Source } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let items = $derived<(Movie | DraggableCandidate)[]>(data.mine);
	const ranked = $derived(new Set(data.mine.map((m) => m.id)));
	let hovered = $state<string | null>(null);
	let placing = $state<Movie | null>(null);
	let errorMessage = $state<string | null>(null);
	const otherName = $derived(data.other?.name ?? 'Them');

	async function saveOrder(ids: string[]) {
		const res = await fetch('/api/order', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ids })
		});
		if (!res.ok) errorMessage = 'Could not save the new order.';
		await invalidateAll();
	}

	function consider(e: CustomEvent<DndEvent<Movie | DraggableCandidate>>) {
		items = e.detail.items;
	}

	async function finalize(e: CustomEvent<DndEvent<Movie | DraggableCandidate>>) {
		items = e.detail.items;
		const droppedIndex = items.findIndex(isDraggableCandidate);
		if (droppedIndex === -1) return saveOrder(items.map((m) => m.id));

		const dropped = items[droppedIndex] as DraggableCandidate;
		const result = await postMovie(dropped.source, dropped.sourceId);
		if (!result) return invalidateAll();
		const ids = items.map((m, i) => (i === droppedIndex ? result.movie.id : m.id));
		// Dropping a movie that's already ranked moves it rather than duplicating it.
		await saveOrder(ids.filter((id, i) => id !== result.movie.id || i === droppedIndex));
	}

	async function postMovie(source: Source, sourceId: string) {
		errorMessage = null;
		const res = await fetch('/api/movies', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ source, sourceId })
		});
		if (!res.ok) {
			errorMessage = 'Could not add that movie.';
			return null;
		}
		return (await res.json()) as { movie: Movie; added: boolean };
	}

	async function add(source: Source, sourceId: string) {
		const result = await postMovie(source, sourceId);
		if (!result) return;
		await invalidateAll();
		if (result.added && data.mine.length > 1) placing = result.movie;
	}

	const unrankedCandidates = $derived(
		data.theirs?.unranked.map(
			(m): Candidate => ({ ...m, source: 'rank', sourceId: m.id, posterUrl: `/poster/${encodeURIComponent(m.id)}` })
		) ?? []
	);

	async function place(index: number | null) {
		const movie = placing;
		placing = null;
		if (!movie || index === null) return;
		const order = data.mine.filter((m) => m.id !== movie.id);
		order.splice(index, 0, movie);
		await saveOrder(order.map((m) => m.id));
	}

	async function remove(movie: Movie) {
		if (!confirm(`Remove ${movie.title} from your list?`)) return;
		await fetch(`/api/movies/${encodeURIComponent(movie.id)}`, { method: 'DELETE' });
		await invalidateAll();
	}

	const onhover = (id: string | null) => (hovered = id);
</script>

{#snippet columnTitle(title: string, subtitle: string)}
	<h2 class="text-lg font-semibold">{title}</h2>
	<p class="mb-3 text-sm text-zinc-500">{subtitle}</p>
{/snippet}

{#snippet addButton(movie: Candidate, label: string)}
	<button
		class="cursor-pointer rounded bg-violet-600 px-3 py-1 text-sm hover:bg-violet-500"
		onclick={() => add(movie.source, movie.sourceId)}>{label}</button
	>
{/snippet}

{#snippet subheading(text: string)}
	<h3 class="mt-6 mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{text}</h3>
{/snippet}

<main class="flex flex-col gap-6 px-4 py-6 lg:px-8">
	<div class="mx-auto w-full max-w-xl">
		<SearchBox {ranked} onadd={(m) => add(m.source, m.sourceId)} />
		{#if errorMessage}
			<p class="mt-2 text-sm text-red-400">{errorMessage}</p>
		{/if}
	</div>

	<div class="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-visible lg:px-0">
		<section class="w-[85vw] flex-none snap-center lg:w-auto">
			{@render columnTitle('You', 'Drag to reorder, or drag movies in from search and the other lists.')}
			{#if items.length === 0}
				<p class="text-zinc-400">Nothing ranked yet. Search above or pick from what you've watched below.</p>
			{/if}
			<ol
				use:dndzone={{ ...dndOptions, items }}
				onconsider={consider}
				onfinalize={finalize}
				class="flex min-h-24 flex-col gap-2"
			>
				{#each items as item, i (item.id)}
					<li animate:flip={{ duration: flipDurationMs }} class="cursor-grab">
						{#if isDraggableCandidate(item)}
							<MovieCard movie={{ ...item, id: item.movieId }} posterUrl={item.posterUrl} rank={i + 1} />
						{:else}
							<MovieCard movie={item} rank={i + 1} highlighted={hovered === item.id} {onhover}>
								<button
									class="cursor-pointer px-2 text-xl text-zinc-600 hover:text-red-400"
									aria-label="Remove {item.title}"
									onclick={() => remove(item)}>×</button
								>
							</MovieCard>
						{/if}
					</li>
				{/each}
			</ol>

			{#if data.watched.length}
				<details class="mt-6">
					<summary class="cursor-pointer text-sm text-zinc-400 hover:text-zinc-200">
						Watched on Jellyfin, not ranked ({data.watched.length})
					</summary>
					<div class="mt-2">
						<SourceList movies={data.watched}>
							{#snippet action(movie: Candidate)}{@render addButton(movie, 'Add')}{/snippet}
						</SourceList>
					</div>
				</details>
			{/if}
		</section>

		<section class="w-[85vw] flex-none snap-center lg:w-auto">
			{@render columnTitle('Together', 'Movies you both ranked, by average placement.')}
			{#if !data.together}
				<p class="text-zinc-400">The other person hasn't logged in yet.</p>
			{:else if data.together.length === 0}
				<p class="text-zinc-400">No movies in common yet.</p>
			{:else}
				<ol class="flex flex-col gap-2">
					{#each data.together as { movie, myRank, theirRank, place, tied } (movie.id)}
						<li>
							<MovieCard {movie} rank={tied ? `${place}=` : place} highlighted={hovered === movie.id} {onhover}>
								<div class="flex-none px-1 text-right text-xs text-zinc-400">
									<div>you #{myRank}</div>
									<div>{otherName} #{theirRank}</div>
								</div>
							</MovieCard>
						</li>
					{/each}
				</ol>
			{/if}
		</section>

		<section class="w-[85vw] flex-none snap-center lg:w-auto">
			{@render columnTitle(otherName, 'Numbered among the movies you both ranked.')}
			{#if !data.theirs}
				<p class="text-zinc-400">The other person hasn't logged in yet.</p>
			{:else}
				{#if data.theirs.shared.length === 0}
					<p class="text-zinc-400">No movies in common yet.</p>
				{/if}
				<ol class="flex flex-col gap-2">
					{#each data.theirs.shared as { movie, rank } (movie.id)}
						<li><MovieCard {movie} {rank} highlighted={hovered === movie.id} {onhover} /></li>
					{/each}
				</ol>
				{#if data.theirs.unranked.length}
					{@render subheading(`Ranked by ${otherName}, not by you`)}
					<SourceList movies={unrankedCandidates}>
						{#snippet action(movie: Candidate)}{@render addButton(movie, 'Rank it')}{/snippet}
					</SourceList>
				{/if}
			{/if}
		</section>
	</div>
</main>

{#if placing}
	<PlaceMovie movie={placing} list={data.mine.filter((m) => m.id !== placing?.id)} ondone={place} />
{/if}
