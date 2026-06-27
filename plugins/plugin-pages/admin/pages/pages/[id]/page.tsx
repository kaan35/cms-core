"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { PageForm } from "@/components/PageForm";
import { Loading } from "@/components/ui/Loading";

export default function PageEditPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const pageId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [pageData, setPageData] = useState<{
    title: string;
    slug: string;
    blocks: any[];
  } | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const data = await apiFetch(`/pages/${pageId}`);
        const page = data.page;
        setPageData({
          title: page.title,
          slug: page.slug,
          blocks: page.blocks || [],
        });
        setIsLoading(false);
      } catch (err: any) {
        if (err instanceof ApiError && err.status === 404) {
          showToast({ message: "Page not found", type: "error" });
        } else if (err instanceof ApiError && err.status === 400) {
          showToast({ message: err.message || "Invalid page ID", type: "error" });
        } else {
          showToast({ message: "Failed to load page", type: "error" });
          console.error("Failed to load page:", err);
        }
        // Redirect after showing error
        router.push("/pages");
      }
    };

    fetchPage();
  }, [pageId, router, showToast]);

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  if (!pageData) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit: {pageData.title}</h1>
          <p className="text-sm text-zinc-400">Update page structure and block configuration</p>
        </div>
      </div>

      <PageForm mode="update" pageId={pageId} initialData={pageData} />
    </div>
  );
}
