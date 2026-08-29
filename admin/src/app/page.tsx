import { getSetupStatusServer } from "@/lib/setup-check";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const status = await getSetupStatusServer();
  if (status.needsSetup) {
    redirect("/setup");
  }
  redirect("/dashboard");
}
