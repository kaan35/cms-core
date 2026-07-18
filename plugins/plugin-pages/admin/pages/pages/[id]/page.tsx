"use client";

import { PageForm } from "@/components/forms/PageForm";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { useApiQuery } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PageEditPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const pageId = params.id as string;

  const [pageData, setPageData] = useState<{
    title: string;
    slug: string;
    status: "draft" | "published";
    blocks: any[];
  } | null>(null);

  const { data, error, isLoading } = useApiQuery<any>(`/pages/${pageId}`);

  useEffect(() => {
    if (data?.page) {
      const page = data.page;
      setPageData({
        title: page.title,
        slug: page.slug,
        status: page.status || "draft",
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
      <Breadcrumb
        items={[{ label: "Pages", href: "/pages" }, { label: pageData.title || "Edit Page" }]}
      />
      <PageHeader title="Edit Page" description="Update page structure and block configuration" />

      <PageForm mode="update" pageId={pageId} initialData={pageData} />
    </div>
  );
}
