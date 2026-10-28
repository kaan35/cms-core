import { ProtectedRoute } from "@cms/admin-shell";
import { PageEditorPage } from "@cms/plugin-pages-admin";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ProtectedRoute requiredPermission={["pages:read:draft", "pages:write"]}>
      <PageEditorPage id={id} />
    </ProtectedRoute>
  );
}
