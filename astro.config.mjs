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
					items: [
						{ label: '01 Editorial', slug: 'public-money-public-code/01-editorial' },
						{ label: '02 What is Free Software?', slug: 'public-money-public-code/02-what-is-free-software' },
						{ label: '03 Using Free Software to Democratise Smart Cities', slug: 'public-money-public-code/03-using-free-software-to-democratise-smart-cities' },
						{ label: '04 The Costs of Vendor Lock-In', slug: 'public-money-public-code/04-the-costs-of-vendor-lock-in' },
						{ label: '05 Hidden Champions', slug: 'public-money-public-code/05-hidden-champions' },
						{ label: '06 The Impact of Free Software on Competition', slug: 'public-money-public-code/06-the-impact-of-free-software-on-competition' },
						{ label: '07 10 Myths about Free Software', slug: 'public-money-public-code/07-10-myths-about-free-software' },
						{ label: '08 Making Business and Economic Sense of Free Software', slug: 'public-money-public-code/08-making-business-and-economic-sense-of-free-software' },
						{ label: '10 Lessons from Open Sourcing in Switzerland', slug: 'public-money-public-code/10-lessons-from-open-sourcing-in-switzerland' },
						{ label: '11 Different Options of Releasing Free Software', slug: 'public-money-public-code/11-different-options-of-releasing-free-software' },
						{ label: '12 Blackbox Election Software', slug: 'public-money-public-code/12-blackbox-election-software' },
						{ label: '13 An Open Approach to IT Security', slug: 'public-money-public-code/13-an-open-approach-to-it-security' },
						{ label: '14 International Cooperation through Free Software', slug: 'public-money-public-code/14-international-cooperation-through-free-software' },
						{ label: '15 EU Projects and Policies Supporting the Use of Free Software', slug: 'public-money-public-code/15-eu-projects-and-policies-supporting-the-use-of-free-software' },
						{ label: '16 Reprogramming Procurement Law', slug: 'public-money-public-code/16-reprogramming-procurement-law' },
						{ label: '17 How to Procure Free Software', slug: 'public-money-public-code/17-how-to-procure-free-software' },
						{ label: '18 First Steps to Support Free Software', slug: 'public-money-public-code/18-first-steps-to-support-free-software' },
					],
				},
				{
					label: 'Miscellaneous',
					items: [{ autogenerate: { directory: 'miscellaneous' } }],
				},
			],
		}),
	],
});
