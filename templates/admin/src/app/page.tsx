"use client";

import { Loading } from "@/components/ui/Loading";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        await apiFetch("/auth/me");
        router.push("/pages");
      } catch (err) {
        router.push("/login");
      }
    }
    checkAuth();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
      <Loading />
    </div>
  );
}
