import BlockRenderer from "@/components/BlockRenderer";
import { getInternalApiUrl } from "@/lib/config";

async function getPageData() {
  const API_BASE = getInternalApiUrl();
  try {
    const res = await fetch(`${API_BASE}/pages/home`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.page;
  } catch (err) {
    console.error("Failed to fetch home page data:", err);
    return null;
  }
}

export default async function HomePage() {
  const page = await getPageData();

  if (!page) {
    const internalUrl = getInternalApiUrl();
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">CMS Core Headless CMS</h1>
        <p className="text-zinc-400 mt-2 max-w-md">
          Please make sure the Fastify API is running at{" "}
          <code className="text-blue-400 font-mono">{internalUrl}</code> and database seed is
          complete.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <BlockRenderer blocks={page.blocks || []} />
    </div>
  );
}
