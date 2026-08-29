import { BlogEditorPage } from "@cms/plugin-blog-admin";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BlogEditorPage id={id} />;
}
