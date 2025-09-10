import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import remarkMath from "remark-math";
import rehypeKatex from 'rehype-katex';
import remarkSqueezeParagraphs from 'remark-squeeze-paragraphs'

import markdownReplace from "./plugins/markdown-replace";

export default defineConfig({
  site: "https://hellosansan.github.io/",
  base: "/",
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: "github-light-default",
      langs: [],
    },

    remarkPlugins: [
      markdownReplace,
      remarkSqueezeParagraphs,
      remarkMath,
    ],

    rehypePlugins: [
      rehypeKatex,
    ]
  },
});
