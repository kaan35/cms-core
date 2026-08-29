import { UserPermissionsEditor } from "@cms/plugin-auth-admin";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UserPermissionsEditor userId={id} />;
}
