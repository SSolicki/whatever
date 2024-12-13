import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: '0.0.0.0', // Allow external access (needed for Docker)
		port: 5173,       // Default Vite port
		strictPort: true, // Enforce the port
		hmr: {
			clientPort: 3000, // This should match the port exposed by Docker
		},
		proxy: {
			'/api': {
				target: 'http://backend:8080',
				changeOrigin: true
			},
			'/ws': {
				target: 'http://backend:8080',
				changeOrigin: true,
				ws: true
			}
		},
		watch: {
			usePolling: true, // Docker-specific fix for file watching
		}
	},
	define: {
		APP_VERSION: JSON.stringify(process.env.npm_package_version),
		APP_BUILD_HASH: JSON.stringify(process.env.APP_BUILD_HASH || 'dev-build')
	},
	build: {
		sourcemap: true,   // Enable source maps for debugging
		target: 'esnext'   // Modern JavaScript target
	},
	worker: {
		format: 'es'       // Ensure ES module format for workers
	}
});
