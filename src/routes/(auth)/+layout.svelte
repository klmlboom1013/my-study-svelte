<script lang="ts">
	import Header from "$lib/components/layout/Header.svelte";
	import Footer from "$lib/components/layout/Footer.svelte";

	let { children } = $props();
</script>

<div
	class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen flex flex-col font-display"
>
	<Header
		showSidebarToggle={false}
		showSearch={false}
		showNotifications={false}
		showEnvironment={true}
		showUserControls={false}
	/>
	<main class="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
		{@render children()}
		<Footer />
	</main>
</div>
