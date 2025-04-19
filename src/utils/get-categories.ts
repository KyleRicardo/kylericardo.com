import { getCollection, type CollectionEntry } from "astro:content";

export interface Category {
  name: string;
  count: number;
  children?: Category[];
}

export interface FlatCategoryInfo {
  name: string;
  count: number;
  slug: string;
  href: string;
}

interface TreeNode {
  count: number;
  children: Map<string, TreeNode>;
}

type PostCategoryData = CollectionEntry<'blog'>['data']['categories']

function flattenCategoryTree(categories: Category[] | undefined, currentPath: string | undefined, flatInfo: FlatCategoryInfo[]) {
  if (!categories)
    return;
  for (const category of categories) {
    const slug = currentPath ? `${currentPath}/${category.name}` : category.name;
    flatInfo.push({
      name: category.name,
      count: category.count,
      slug,
      href: `/categories/${slug}`,
    });
    flattenCategoryTree(category.children, slug, flatInfo);
  }
}

export function getFlatCategoryInfo(categories: PostCategoryData): FlatCategoryInfo[] {
  // Step 1: 构建树形结构
  const root: TreeNode = {
    count: 0,
    children: new Map(),
  };

  const paths = getCategoryPaths(categories);
  buildCategoryTree(paths, root);

  // Step 2: 转换树结构并排序
  const sorted = convertTreeToCategory(root);
  const flatInfo: FlatCategoryInfo[] = [];
  flattenCategoryTree(sorted, undefined, flatInfo);
  return flatInfo;
}

export async function generateCategorySlugs(): Promise<string[]> {
  const categories = await getCategories();
  const flatInfo: FlatCategoryInfo[] = [];
  flattenCategoryTree(categories, undefined, flatInfo);
  return flatInfo.map(info => info.slug);
}

function buildCategoryTree(categoryPaths: string[][], root: TreeNode) {
  for (const path of categoryPaths) {
    let currentNode = root;
    for (const name of path) {
      const node = currentNode.children.get(name);
      if (!node) {
        const newNode = { count: 1, children: new Map() }
        currentNode.children.set(name, newNode)
        currentNode = newNode
      } else {
        node.count++;
        currentNode = node;
      }
    }
  }
}

export async function getCategories(): Promise<Category[]> {
  const posts = await getCollection('blog', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });
  
  // Step 1: 构建树形结构
  const root: TreeNode = {
    count: 0,
    children: new Map(),
  };

  for (const post of posts) {
    const paths = getCategoryPaths(post.data.categories);
    buildCategoryTree(paths, root);
  }

  // Step 2: 转换树结构并排序
  return convertTreeToCategory(root);
}

// 辅助函数：从 Post 中提取分类路径
function getCategoryPaths(categories: PostCategoryData): string[][] {
  if (!categories) return [];

  if (typeof categories === "string") {
    return [[categories]];
  }

  return categories.map((item) => Array.isArray(item) ? item : [item]);
}

// 辅助函数：转换树结构并排序
function convertTreeToCategory(node: TreeNode): Category[] {
  return Array.from(node.children.entries())
    .map(([name, treeNode]) => ({
      name,
      count: treeNode.count,
      treeNode,
    }))
    .sort((a, b) => {
      // 按 count 降序，count 相同按 name 升序
      return b.count - a.count || a.name.localeCompare(b.name);
    })
    .map(({ name, count, treeNode }) => {
      const category: Category = { name, count };
      if (treeNode.children.size > 0) {
        category.children = convertTreeToCategory(treeNode);
      }
      return category;
    });
}
