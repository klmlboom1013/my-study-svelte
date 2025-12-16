<script>
    let count = $state(0);

    function increment() {
        count += 1;
    }
</script>

<h1>Welcome to SvelteKit</h1>
<p>
    Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the
    documentation
</p>

<button onclick={increment}>
    Clicks: {count}
</button>
