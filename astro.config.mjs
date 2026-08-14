// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Translations',
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
			],
		}),
	],
});
