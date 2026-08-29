import { getSetupStatusServer } from "@/lib/setup-check";
import { redirect } from "next/navigation";
import { SetupForm } from "./SetupForm";

export default async function SetupPage() {
  const status = await getSetupStatusServer();
  if (!status.needsSetup) {
    redirect("/login");
  }

  return <SetupForm />;
}
