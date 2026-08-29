import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSetupStatusServer } from "@/lib/setup-check";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const status = await getSetupStatusServer();
  if (status.needsSetup) {
    redirect("/setup");
  }

  // If user already has an active session, redirect to /dashboard server-side
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (cookieHeader) {
    try {
      const apiUrl = process.env.API_URL || "http://localhost:3001";
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { cookie: cookieHeader },
        cache: "no-store",
      });
      if (res.ok) {
        redirect("/dashboard");
      }
    } catch (err: unknown) {
      if ((err as Error)?.message?.includes("NEXT_REDIRECT")) {
        throw err;
      }
    }
  }

  return <LoginForm />;
}
