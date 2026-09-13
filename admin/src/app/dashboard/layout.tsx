import { AdminLayout } from "@cms/admin-shell";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as React from "react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const apiUrl = process.env.API_URL || "http://localhost:3001";

  const [userRes, pluginsRes] = await Promise.all([
    fetch(`${apiUrl}/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    }).catch(() => null),
    fetch(`${apiUrl}/plugins`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    }).catch(() => null),
  ]);

  if (!userRes || userRes.status === 401 || !userRes.ok) {
    redirect("/login");
  }

  const userData = await userRes.json();
  const user = userData?.user;

  if (!user) {
    redirect("/login");
  }

  const plugins = pluginsRes?.ok ? await pluginsRes.json() : null;

  return (
    <AdminLayout initialUser={user} initialPlugins={plugins}>
      {children}
    </AdminLayout>
  );
}
