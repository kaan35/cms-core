import { BlockRenderer } from "@/components/BlockRenderer";
import { api, type PageDoc } from "@cms/client-sdk";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const homePage = await api.get<PageDoc>("/pages/home").catch(() => null);

  return {
    title: homePage?.metaTitle || homePage?.title || "",
    description: homePage?.metaDescription || "",
  };
}

export default async function HomePage() {
  const homePage = await api.get<PageDoc>("/pages/home").catch(() => null);

  if (!homePage || !homePage.blocks || homePage.blocks.length === 0) {
    notFound();
  }

  return <BlockRenderer blocks={homePage.blocks} />;
}
