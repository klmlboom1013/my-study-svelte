import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: 5137,
		strictPort: true,
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
		}
	}
});
