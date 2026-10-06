<script lang="ts">
	import { enhance } from '$app/forms';
	import { APP_NAME } from '#lib/app.js';
	import logo from '#lib/assets/logo.svg';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<main class="mx-auto mt-24 max-w-sm px-4">
	<img src={logo} alt="" class="mx-auto mb-4 size-28" />
	<h1 class="mb-6 text-center text-3xl font-bold">{APP_NAME}</h1>
	<form method="POST" use:enhance class="flex flex-col gap-3">
		<input
			name="username"
			placeholder="Jellyfin username"
			autocomplete="username"
			required
			value={form?.username ?? ''}
			class="rounded bg-zinc-800 px-3 py-2"
		/>
		<input
			name="password"
			type="password"
			placeholder="Password"
			autocomplete="current-password"
			class="rounded bg-zinc-800 px-3 py-2"
		/>
		{#if form?.error}
			<p class="text-sm text-red-400">{form.error}</p>
		{/if}
		<button class="rounded bg-violet-600 px-3 py-2 font-medium hover:bg-violet-500">Log in with Jellyfin</button>
	</form>
</main>
