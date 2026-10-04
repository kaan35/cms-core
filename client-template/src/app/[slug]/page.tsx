import { BlockRenderer } from "@/components/BlockRenderer";
import { api, type PageDoc } from "@cms/client-sdk";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await api.get<PageDoc>(`/pages/${slug}`).catch(() => null);

  if (!page) {
    return {
      title: "Page Not Found",
    };
  }

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
  };
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await api.get<PageDoc>(`/pages/${slug}`).catch(() => null);

  if (!page || page.status !== "published") {
    notFound();
  }

  return (
    <div className="flex flex-col w-full py-8">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 mb-8 text-center">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
          {page.title}
        </h1>
      </div>

      <BlockRenderer blocks={page.blocks} />
    </div>
  );
}
