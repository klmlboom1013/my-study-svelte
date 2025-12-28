<script lang="ts">
	import "../app.css";
	import favicon from "$lib/assets/favicon.svg";
	import Header from "$lib/components/layout/Header.svelte";
	import Footer from "$lib/components/layout/Footer.svelte";

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link href="https://fonts.googleapis.com" rel="preconnect" />
	<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap"
		rel="stylesheet"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div
	class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen flex flex-col font-display"
>
	<Header />
	<main class="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
		{@render children()}
		<Footer />
	</main>
</div>
