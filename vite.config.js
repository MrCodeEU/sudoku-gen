import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import envCompatible from 'vite-plugin-env-compatible';

export default defineConfig({
    plugins: [sveltekit(), envCompatible()],
    worker: {
        format: 'es',
        plugins: () => []
    }
});
