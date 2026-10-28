import { Suspense } from "react";
import { apiServer } from "@/lib/server-api";
import { getSetupStatusServer } from "@/lib/setup-check";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const isSuspended = resolvedParams?.suspended === "true";

  const status = await getSetupStatusServer();
  if (status.needsSetup) {
    redirect("/setup");
  }

  // If user already has an active session and is not suspended, redirect to /dashboard server-side
  if (!isSuspended) {
    try {
      const userRes = await apiServer.get<{ user?: unknown }>("/auth/me").catch(() => null);
      if (userRes?.user) {
        redirect("/dashboard");
      }
    } catch (err: unknown) {
      if ((err as Error)?.message?.includes("NEXT_REDIRECT")) {
        throw err;
      }
    }
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
