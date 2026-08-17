// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://mtoyokura.github.io',
	base: '/translations',
	integrations: [
		starlight({
			title: 'Translations',
			customCss: ['./src/styles/custom.css'],
			favicon: '/favicon.png',
			locales: {
				root: { label: '日本語', lang: 'ja' },
			},
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/MToyokura/translations' }],
			sidebar: [
				{
					label: 'Open Access Network',
					items: [
						{
							label: 'Open Access primers',
							collapsed: false,
							items: [
								{ label: 'オープンアクセスとは？', slug: 'open-access-network/information/open-access-primers/what-does-open-access-mean' },
								{ label: 'オープンアクセスと再利用', slug: 'open-access-network/information/open-access-primers/open-access-and-reuse' },
								{ label: 'グリーン・オープンアクセスとゴールド・オープンアクセス', slug: 'open-access-network/information/open-access-primers/green-and-gold' },
								{ label: 'オープンアクセスと研究データ', slug: 'open-access-network/information/open-access-primers/open-access-to-data' },
							],
						},
					],
				},
				{
					label: 'The Open Revolution',
					items: [{ autogenerate: { directory: 'open-revolution' } }],
				},
				{
					label: 'Public Money Public Code',
					items: [{ label: 'Modernising Public Infrastructure with Free Software', slug: 'modernising-with-free-software' }],
				},
				{
					label: 'Miscellaneous',
					items: [{ autogenerate: { directory: 'miscellaneous' } }],
				},
			],
		}),
	],
});
