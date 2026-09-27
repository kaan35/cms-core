import { apiServer } from "@/lib/server-api";
import { AdminLayout, type AuthUser } from "@cms/admin-shell";
import { redirect } from "next/navigation";
import * as React from "react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [userData, plugins] = await Promise.all([
    apiServer.get<{ user?: AuthUser }>("/auth/me").catch(() => null),
    apiServer.get<unknown>("/plugins").catch(() => null),
  ]);

  const user = userData?.user;
  if (!user) {
    redirect("/login");
  }

  return (
    <AdminLayout initialUser={user} initialPlugins={plugins}>
      {children}
    </AdminLayout>
  );
}
