import { apiServer } from "@/lib/server-api";
import { getSetupStatusServer } from "@/lib/setup-check";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const status = await getSetupStatusServer();
  if (status.needsSetup) {
    redirect("/setup");
  }

  // If user already has an active session, redirect to /dashboard server-side
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

  return <LoginForm />;
}
