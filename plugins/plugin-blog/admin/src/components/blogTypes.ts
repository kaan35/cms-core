export interface BlogPostListItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverMediaId?: string | undefined;
  status: "published" | "draft";
  version?: number | undefined;
  updatedAt?: string | undefined;
  createdAt?: string | undefined;
}
