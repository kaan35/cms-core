import { api, slugify, toast, useApi, useSaveShortcut } from "@cms/admin-shell";
import { useRouter } from "next/navigation";
import * as React from "react";
import type { PageBlock } from "./blockCatalog";

export interface PageDoc {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  pageType?: "standard" | "home" | undefined;
  blocks: PageBlock[];
  metaTitle?: string | undefined;
  metaDescription?: string | undefined;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageVersion {
  id: string;
  pageId: string;
  version: number;
  data: {
    title: string;
    slug: string;
    status: "draft" | "published";
    pageType?: "standard" | "home" | undefined;
    blocks: PageBlock[];
    metaTitle?: string | undefined;
    metaDescription?: string | undefined;
  };
  changedBy?: string | undefined;
  createdAt: string;
}

export interface PageEditorState {
  title: string;
  slug: string;
  status: "draft" | "published";
  pageType: "standard" | "home";
  metaTitle: string;
  metaDescription: string;
  blocks: PageBlock[];
  version: number;
}

export function usePageEditor(id: string) {
  const router = useRouter();
  const isNew = id === "new";

  const { data: pageDoc, isLoading, mutate } = useApi<PageDoc>(isNew ? null : `/pages/${id}`);

  const [inputData, setInputData] = React.useState<PageEditorState>({
    title: "",
    slug: "",
    status: "draft",
    pageType: "standard",
    metaTitle: "",
    metaDescription: "",
    blocks: [],
    version: 1,
  });
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = React.useState(false);

  const shouldFetchVersions = isVersionsOpen && !isNew;
  const { data: rawVersions, isLoading: isLoadingVersions } = useApi<PageVersion[]>(
    shouldFetchVersions ? `/pages/${id}/versions` : null,
  );
  const versions = React.useMemo(() => {
    return Array.isArray(rawVersions) ? rawVersions : [];
  }, [rawVersions]);

  React.useEffect(() => {
    if (isNew) {
      setInputData((prev) => ({
        ...prev,
        blocks: [
          {
            type: "hero",
            title: "Welcome to Our Platform",
            subtitle: "Create memorable experiences with high-performance content delivery.",
          },
        ],
      }));
    } else if (pageDoc) {
      setInputData({
        title: pageDoc.title || "",
        slug: pageDoc.slug || "",
        status: pageDoc.status || "draft",
        pageType: pageDoc.pageType || "standard",
        metaTitle: pageDoc.metaTitle || "",
        metaDescription: pageDoc.metaDescription || "",
        blocks: Array.isArray(pageDoc.blocks) ? pageDoc.blocks : [],
        version: pageDoc.version || 1,
      });
      setIsSlugManuallyEdited(true);
    }
  }, [id, isNew, pageDoc]);

  const handleTitleChange = (val: string) => {
    setInputData((prev) => ({
      ...prev,
      title: val,
      slug: isSlugManuallyEdited ? prev.slug : slugify(val),
    }));
  };

  const handleSlugChange = (val: string) => {
    setIsSlugManuallyEdited(true);
    setInputData((prev) => ({
      ...prev,
      slug: slugify(val),
    }));
  };

  const handleSave = async () => {
    if (!inputData.title.trim()) {
      toast.error("Please provide a page title");
      return;
    }

    if (inputData.blocks.length === 0) {
      toast.error("Page must contain at least one content block");
      return;
    }

    setIsSubmitting(true);
    const cleanBlocks = inputData.blocks.map((block) => {
      if (block.type === "hero") {
        const hero = { ...block };
        const pCta = hero["primaryCta"] as { label?: string; url?: string } | undefined;
        const sCta = hero["secondaryCta"] as { label?: string; url?: string } | undefined;
        if (pCta && !pCta.label?.trim() && !pCta.url?.trim()) {
          delete hero["primaryCta"];
        }
        if (sCta && !sCta.label?.trim() && !sCta.url?.trim()) {
          delete hero["secondaryCta"];
        }
        return hero;
      }
      return block;
    });

    const payload = {
      title: inputData.title.trim(),
      slug: inputData.slug.trim() || slugify(inputData.title),
      status: inputData.status,
      pageType: inputData.pageType,
      blocks: cleanBlocks,
      metaTitle: inputData.metaTitle.trim() || undefined,
      metaDescription: inputData.metaDescription.trim() || undefined,
    };

    try {
      if (isNew) {
        const created = await api.post<PageDoc>("/pages", payload);
        toast.success("Page created successfully");
        router.push(`/dashboard/pages/${created.id}`);
      } else {
        const updated = await api.put<PageDoc>(`/pages/${id}`, payload);
        toast.success("Page updated successfully");
        setInputData((prev) => ({ ...prev, version: updated.version }));
        mutate(updated, false);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save page");
    } finally {
      setIsSubmitting(false);
    }
  };

  useSaveShortcut(handleSave);

  const handleRestoreVersion = (ver: PageVersion) => {
    if (!ver.data) return;
    setInputData({
      title: ver.data.title || "",
      slug: ver.data.slug || "",
      status: ver.data.status || "draft",
      pageType: ver.data.pageType || "standard",
      metaTitle: ver.data.metaTitle || "",
      metaDescription: ver.data.metaDescription || "",
      blocks: Array.isArray(ver.data.blocks) ? ver.data.blocks : [],
      version: ver.version,
    });
    setIsVersionsOpen(false);
    toast.success(`Restored draft from version ${ver.version}. Click Save to apply.`);
  };

  return {
    isNew,
    pageDoc,
    isLoading,
    isSubmitting,
    inputData,
    setInputData,
    handleTitleChange,
    handleSlugChange,
    handleSave,
    isVersionsOpen,
    setIsVersionsOpen,
    isLoadingVersions,
    versions,
    handleRestoreVersion,
  };
}
