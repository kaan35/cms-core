"use client";

import {
  apiClient,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  slugify,
  Textarea,
  toast,
  useApi,
} from "@cms/admin-shell";
import { ArrowLeft, Clock, Layers, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { PageBlockEditor, type PageBlock } from "./PageBlockEditor";

interface PageDoc {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  blocks: PageBlock[];
  metaTitle?: string | undefined;
  metaDescription?: string | undefined;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface PageVersion {
  id: string;
  pageId: string;
  version: number;
  data: Omit<PageDoc, "id">;
  changedBy?: string | undefined;
  createdAt: string;
}

export function PageEditorPage({ id }: { id: string }) {
  const router = useRouter();
  const isNew = id === "new";

  const { data: pageDoc, isLoading, mutate } = useApi<PageDoc>(isNew ? null : `/api/pages/${id}`);

  const [inputData, setInputData] = React.useState({
    title: "",
    slug: "",
    status: "draft" as "draft" | "published",
    metaTitle: "",
    metaDescription: "",
    blocks: [] as PageBlock[],
    version: 1,
  });
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = React.useState(false);

  const [formState, setFormState] = React.useState({
    isSubmitting: false,
  });

  // Version history state
  const [isVersionsOpen, setIsVersionsOpen] = React.useState(false);
  const shouldFetchVersions = isVersionsOpen && !isNew;
  const { data: rawVersions, isLoading: isLoadingVersions } = useApi<PageVersion[]>(
    shouldFetchVersions ? `/api/pages/${id}/versions` : null,
  );
  const versions = React.useMemo(() => {
    return Array.isArray(rawVersions) ? rawVersions : [];
  }, [rawVersions]);

  // Load existing page into inputData
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

    setFormState({ isSubmitting: true });
    const payload = {
      title: inputData.title.trim(),
      slug: inputData.slug.trim() || slugify(inputData.title),
      status: inputData.status,
      blocks: inputData.blocks,
      metaTitle: inputData.metaTitle.trim() || undefined,
      metaDescription: inputData.metaDescription.trim() || undefined,
    };

    try {
      if (isNew) {
        const created = await apiClient<PageDoc>("/api/pages", {
          method: "POST",
          body: payload,
        });
        toast.success("Page created successfully");
        router.push(`/dashboard/pages/${created.id}`);
      } else {
        const updated = await apiClient<PageDoc>(`/api/pages/${id}`, {
          method: "PUT",
          body: payload,
        });
        toast.success("Page updated successfully");
        setInputData((prev) => ({ ...prev, version: updated.version }));
        mutate(updated, false);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save page");
    } finally {
      setFormState({ isSubmitting: false });
    }
  };

  const handleOpenVersions = () => {
    setIsVersionsOpen(true);
  };

  const handleRestoreVersion = (ver: PageVersion) => {
    if (!ver.data) return;
    setInputData({
      title: ver.data.title || "",
      slug: ver.data.slug || "",
      status: ver.data.status || "draft",
      metaTitle: ver.data.metaTitle || "",
      metaDescription: ver.data.metaDescription || "",
      blocks: Array.isArray(ver.data.blocks) ? ver.data.blocks : [],
      version: ver.version,
    });
    setIsVersionsOpen(false);
    toast.success(`Restored snapshot from version #${ver.version}. Click Save to apply changes.`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/pages">
            <Button variant="ghost" size="icon-sm" className="rounded-xl">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {isNew ? "New Page" : inputData.title || "Untitled Page"}
              </h1>
              {!isNew && (
                <span className="text-[11px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border">
                  v{inputData.version}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isNew
                ? "Create a new modular content page"
                : `Route: /pages/${inputData.slug || "..."}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!isNew && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenVersions}
              className="h-8 text-xs gap-1.5"
            >
              <Clock className="size-3.5" />
              History
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            loading={formState.isSubmitting}
            iconStart={<Save className="size-3.5" />}
            className="h-8 text-xs font-semibold gap-1.5 shadow-sm"
          >
            {formState.isSubmitting ? "Saving..." : isNew ? "Create Page" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Meta & Configuration Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Layers className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Page Settings & Metadata</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="page-title">Page Title *</Label>
            <Input
              id="page-title"
              placeholder="e.g. Products & Solutions"
              value={inputData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="page-status">Publish Status</Label>
            <Select
              value={inputData.status}
              onValueChange={(val) =>
                setInputData((prev) => ({ ...prev, status: val as "draft" | "published" }))
              }
            >
              <SelectTrigger id="page-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-muted-foreground" />
                    Draft
                  </span>
                </SelectItem>
                <SelectItem value="published">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Published
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="page-slug">URL Slug</Label>
            <div className="flex items-center">
              <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-xs font-mono text-muted-foreground">
                /pages/
              </span>
              <Input
                id="page-slug"
                className="rounded-l-none font-mono text-xs"
                placeholder="products-and-solutions"
                value={inputData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meta-title">SEO Meta Title (Optional)</Label>
            <Input
              id="meta-title"
              placeholder="Defaults to Page Title if empty"
              value={inputData.metaTitle}
              onChange={(e) => setInputData((prev) => ({ ...prev, metaTitle: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="meta-desc">SEO Meta Description (Optional)</Label>
          <Textarea
            id="meta-desc"
            rows={2}
            placeholder="Brief summary for search engine results and social sharing preview..."
            value={inputData.metaDescription}
            onChange={(e) => setInputData((prev) => ({ ...prev, metaDescription: e.target.value }))}
          />
        </div>
      </div>

      {/* Block Canvas Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground">
              Content Layout Canvas
            </h2>
            <p className="text-xs text-muted-foreground">
              Add, rearrange, and configure modular visual blocks for this page.
            </p>
          </div>
        </div>

        <PageBlockEditor
          blocks={inputData.blocks}
          onChange={(newBlocks) => setInputData((prev) => ({ ...prev, blocks: newBlocks }))}
        />
      </div>

      {/* Version History Dialog */}
      <Dialog open={isVersionsOpen} onOpenChange={setIsVersionsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-6">
          <DialogHeader className="shrink-0 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              Version History
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review and restore previous saved revisions of this page layout.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pt-2 pr-1">
            {isLoadingVersions ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No previous versions recorded yet. Revisions are created each time you save changes.
              </div>
            ) : (
              versions.map((ver) => (
                <div
                  key={ver.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-card/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">
                        Version #{ver.version}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(ver.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>{ver.data.title}</span>
                      <span>•</span>
                      <span>{ver.data.blocks?.length || 0} blocks</span>
                      <span>•</span>
                      <span className="capitalize">{ver.data.status}</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestoreVersion(ver)}
                    className="h-7 text-xs gap-1"
                  >
                    <RotateCcw className="size-3" />
                    Restore
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
