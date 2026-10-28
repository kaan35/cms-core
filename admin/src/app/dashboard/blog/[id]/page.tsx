import { ProtectedRoute } from "@cms/admin-shell";
import { BlogEditorPage } from "@cms/plugin-blog-admin";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ProtectedRoute requiredPermission={["blog:read:draft", "blog:write"]}>
      <BlogEditorPage id={id} />
    </ProtectedRoute>
  );
}
