import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="flex flex-col items-center space-y-4">
        <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center">
          <FileQuestion className="h-10 w-10 text-red-400" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Resource Not Found</h1>
          <p className="text-zinc-400 max-w-md">
            The resource you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
        </div>
      </div>
      <Link href="/">
        <Button icon={ArrowLeft}>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
