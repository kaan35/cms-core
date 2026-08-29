import * as React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminLayout } from "@cms/admin-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const apiUrl = process.env.API_URL || "http://localhost:3001";
  let user = null;

  try {
    const res = await fetch(`${apiUrl}/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });

    if (!res.ok) {
      redirect("/login");
    }

    const data = await res.json();
    user = data?.user;
  } catch (err: unknown) {
    if ((err as Error)?.message?.includes("NEXT_REDIRECT")) {
      throw err;
    }
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  return <AdminLayout initialUser={user}>{children}</AdminLayout>;
}
