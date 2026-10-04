import { resolveMediaUrl } from "@/lib/utils";
import type { HeroBlock as HeroBlockType } from "@cms/client-sdk";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export function HeroBlock({ data }: { data: HeroBlockType }) {
  const bgUrl = resolveMediaUrl(data.mediaId);
  const layout = data.mediaLayout || "background";
  const hasPrimaryCta = Boolean(data.primaryCta?.label?.trim());
  const hasSecondaryCta = Boolean(data.secondaryCta?.label?.trim());

  // Common Action Buttons Component
  const renderActions = (align: "center" | "left" = "center") => {
    if (!hasPrimaryCta && !hasSecondaryCta) return null;
    return (
      <div
        className={`mt-8 flex flex-wrap items-center gap-4 ${
          align === "center" ? "justify-center" : "justify-start"
        }`}
      >
        {hasPrimaryCta && data.primaryCta && (
          <Link
            href={data.primaryCta.url || "/"}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95 cursor-pointer"
          >
            <span>{data.primaryCta.label}</span>
            <ArrowRight className="size-4" />
          </Link>
        )}

        {hasSecondaryCta && data.secondaryCta && (
          <Link
            href={data.secondaryCta.url || "/blog"}
            className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur-md hover:bg-card transition-all active:scale-95 cursor-pointer"
          >
            <span>{data.secondaryCta.label}</span>
          </Link>
        )}
      </div>
    );
  };

  // 1. SIDE-BY-SIDE FEATURED IMAGE LAYOUT
  if (layout === "featured" && bgUrl) {
    return (
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_50%,var(--primary)_0%,transparent_65%)] opacity-15 pointer-events-none -z-10" />

        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 text-left space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur-md shadow-xs">
                <Sparkles className="size-3.5 text-primary" />
                <span>Next-Generation Architecture</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-tight">
                {data.title || "Build Lightning-Fast Digital Experiences"}
              </h1>

              {data.subtitle && (
                <p className="text-base text-muted-foreground leading-relaxed pt-2">
                  {data.subtitle}
                </p>
              )}

              {renderActions("left")}
            </div>

            {/* Right Featured Visual Column */}
            <div className="lg:col-span-6">
              <div className="relative group rounded-2xl overflow-hidden border border-border/80 bg-card/40 p-2 shadow-2xl backdrop-blur-sm">
                <div className="relative rounded-xl overflow-hidden bg-muted/40 flex items-center justify-center">
                  <img
                    src={bgUrl}
                    alt={data.title || "Featured hero visual"}
                    className="w-full h-auto max-h-[500px] object-cover rounded-lg transition-transform duration-500 group-hover:scale-102"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 2. SHOWCASE BANNER BELOW HEADLINE LAYOUT
  if (layout === "banner" && bgUrl) {
    return (
      <section className="relative overflow-hidden py-20 sm:py-28 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,var(--primary)_0%,transparent_65%)] opacity-15 pointer-events-none -z-10" />

        <div className="container mx-auto max-w-5xl px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md mb-6 shadow-xs">
            <Sparkles className="size-3.5 text-primary" />
            <span>Next-Generation Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground sm:leading-tight">
            {data.title || "Build Lightning-Fast Digital Experiences"}
          </h1>

          {data.subtitle && (
            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {data.subtitle}
            </p>
          )}

          {renderActions("center")}

          {/* Large Showcase Banner */}
          <div className="mt-14 relative group rounded-2xl overflow-hidden border border-border/80 bg-card/40 p-2.5 shadow-2xl backdrop-blur-md">
            <div className="relative rounded-xl overflow-hidden bg-muted/40 flex items-center justify-center">
              <img
                src={bgUrl}
                alt={data.title || "Showcase hero banner"}
                className="w-full h-auto max-h-[640px] object-cover rounded-lg transition-transform duration-700 group-hover:scale-101"
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 3. FULL BACKGROUND BACKDROP LAYOUT (Default)
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 text-center">
      {/* Rich Atmospheric Hero Background Media */}
      {bgUrl && (
        <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none">
          <img
            src={bgUrl}
            alt={data.title || "Hero backdrop"}
            className="size-full object-cover object-center opacity-70 dark:opacity-50 scale-105 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        </div>
      )}

      {/* Subtle Ambient Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--primary)_0%,transparent_70%)] opacity-15 pointer-events-none -z-10" />

      <div className="container relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md mb-6 shadow-sm">
          <Sparkles className="size-3.5 text-primary" />
          <span>Next-Generation Headless Architecture</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground sm:leading-tight drop-shadow-sm">
          {data.title || "Build Lightning-Fast Digital Experiences"}
        </h1>

        {data.subtitle && (
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {data.subtitle}
          </p>
        )}

        {renderActions("center")}
      </div>
    </section>
  );
}
