import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../config.js';

export async function GET(context: APIContext) {
  const postImportResult = import.meta.glob('../posts/*.md', { eager: true });
  const posts = Object.values(postImportResult);

  // Filter out hidden posts
  const visiblePosts = posts.filter(post => !post.frontmatter.hidden);

  return rss({
    title: SITE_TITLE,
    description: '谈论政治、社会以及生活', // Placeholder description
    site: context.site?.toString() || 'https://hellosansan.github.io/',
    items: visiblePosts.map((post) => ({
      title: post.frontmatter.title,
      pubDate: post.frontmatter.added,
      description: post.frontmatter.description,
      // The `url` property is required for RSS items.
      // Here we're using the post's slug as the link.
      link: post.url,
    })),
    customData: `<language>zh-cn</language>`,
  });
}
