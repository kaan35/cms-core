import { PageEditorPage } from "@cms/plugin-pages-admin";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageEditorPage id={id} />;
}
