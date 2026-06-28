"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useApiQuery } from "@/hooks/useApi";
import { PageForm } from "@/components/PageForm";
import { Loading } from "@/components/ui/Loading";

export default function PageEditPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const pageId = params.id as string;

  const [pageData, setPageData] = useState<{
    title: string;
    slug: string;
    blocks: any[];
  } | null>(null);

  const { data, error, isLoading } = useApiQuery<any>(`/pages/${pageId}`);

  useEffect(() => {
    if (data?.page) {
      const page = data.page;
      setPageData({
        title: page.title,
        slug: page.slug,
        blocks: page.blocks || [],
      });
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      if (error instanceof ApiError && error.status === 404) {
        showToast({ message: "Page not found", type: "error" });
      } else if (error instanceof ApiError && error.status === 400) {
        showToast({ message: error.message || "Invalid page ID", type: "error" });
      } else {
        showToast({ message: "Failed to load page", type: "error" });
      }
      router.push("/pages");
    }
  }, [error, router, showToast]);

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  if (!pageData) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Page</h1>
          <p className="text-sm text-zinc-400">Update page structure and block configuration</p>
        </div>
      </div>

      <PageForm mode="update" pageId={pageId} initialData={pageData} />
    </div>
  );
}
