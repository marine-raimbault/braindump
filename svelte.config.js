import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html' // SPA mode
		}),
		// Change 'braindump' to your GitHub repo name
		paths: {
			base: process.env.NODE_ENV === 'production' ? '/braindump' : ''
		}
	}
};

export default config;
