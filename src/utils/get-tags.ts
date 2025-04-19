import { getCollection } from "astro:content";

interface Tag {
  name: string;
  count: number;
}

export async function getTags(): Promise<Tag[]> {
  // Get all blog posts using Astro.glob
  const posts = await getCollection('blog', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });
  // Create a map to store tag counts
  const tagCount = new Map<string, number>();

  // Count occurrences of each tag
  for (const post of posts) {
    if (post.data.tags) {
      for (const tag of post.data.tags) {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      }
    }
  }

  // Convert map to array of objects and sort by count
  return Array.from(tagCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
