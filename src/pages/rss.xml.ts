import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../config.js';
import { slugify } from '../utils/slugify';

export async function GET(context: APIContext) {
  const postImportResult = import.meta.glob('../posts/*.md', { eager: true });
  const posts = Object.values(postImportResult);
  // Filter out hidden posts
  const visiblePosts = posts.filter((post: any) => !post.frontmatter.hidden);
  
  return rss({
    title: SITE_TITLE,
    description: '谈论政治、社会以及生活', // Placeholder description
    site: context.site?.toString() || 'https://hellosansan.github.io/',
    items: visiblePosts.map((post: any) => ({
      title: post.frontmatter.title,
      pubDate: post.frontmatter.added,
      description: post.frontmatter.description,
      // 手动构建拼音链接
      link: `/post/${slugify(post.frontmatter.title)}/`,
    })),
    customData: `<language>zh-cn</language>`,
  });
}
