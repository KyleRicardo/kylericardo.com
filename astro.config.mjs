// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import icon from 'astro-icon';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

import { remarkReadingTime } from './remark-reading-time.mjs';
import { remarkAutoExcerpt } from './remark-auto-excerpt.mjs';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },
  markdown: {
    remarkPlugins: [
      remarkReadingTime,
      remarkAutoExcerpt,
    ],
    shikiConfig: {
      theme: 'tokyo-night',
    },
  },

  integrations: [icon(), mdx(), sitemap(), react()]
});
