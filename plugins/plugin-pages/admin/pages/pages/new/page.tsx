"use client";

import { PageForm } from "@/components/PageForm";

export default function PageNewPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Page</h1>
          <p className="text-sm text-zinc-400">
            Design page structure using modular blocks
          </p>
        </div>
      </div>

      <PageForm mode="create" />
    </div>
  );
}
