import { resolveMediaUrl } from "@/lib/utils";
import type { GalleryBlock as GalleryBlockType } from "@cms/client-sdk";
import { ImageIcon } from "lucide-react";

export function GalleryBlock({ data }: { data: GalleryBlockType }) {
  const images = data.images || [];

  return (
    <section className="py-16">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        {data.title && (
          <div className="mb-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {data.title}
            </h2>
          </div>
        )}

        {images.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center text-muted-foreground text-sm">
            <ImageIcon className="mx-auto size-8 mb-2 opacity-50" />
            <p>No gallery images configured.</p>
          </div>
        ) : (
          <div
            className={
              data.layout === "masonry"
                ? "columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4"
                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            }
          >
            {images.map((img, idx) => {
              const mediaUrl = resolveMediaUrl(img.mediaId) || "/placeholder.png";

              return (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/50 break-inside-avoid"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-muted/40 flex items-center justify-center">
                    <img
                      src={mediaUrl}
                      alt={img.caption || `Gallery image ${idx + 1}`}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {img.caption && (
                    <div className="p-3 text-xs font-medium text-muted-foreground bg-card/90 border-t border-border/60">
                      {img.caption}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
