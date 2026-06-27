import { getInternalApiUrl } from "@/lib/config";
import { notFound } from "next/navigation";
import BlockRenderer from "@/components/BlockRenderer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPageData(slug: string) {
  const API_BASE = getInternalApiUrl();
  try {
    const res = await fetch(`${API_BASE}/pages/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.page;
  } catch (err) {
    console.error(`Failed to fetch page data for slug: ${slug}`, err);
    return null;
  }
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPageData(slug);

  if (!page) {
    notFound();
  }

  return (
    <div className="flex-1 flex flex-col">
      <BlockRenderer blocks={page.blocks || []} />
    </div>
  );
}
