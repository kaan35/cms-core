import { ProtectedRoute } from "@cms/admin-shell";
import { BlogListPage } from "@cms/plugin-blog-admin";

export default function BlogPage() {
  return (
    <ProtectedRoute requiredPermission={["blog:read:draft", "blog:write"]}>
      <BlogListPage />
    </ProtectedRoute>
  );
}
