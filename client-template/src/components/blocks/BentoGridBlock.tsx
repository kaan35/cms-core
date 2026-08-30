import {
  CheckCircle2,
  Code2,
  Compass,
  Cpu,
  Database,
  Flame,
  Globe,
  Layers,
  Lock,
  Rocket,
  Server,
  Shield,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import Link from "next/link";

export interface BentoCard {
  title: string;
  description: string;
  badge?: string;
  icon?: string;
  url?: string;
  size?: "1" | "2" | "3" | "small" | "medium" | "large" | "full";
}

export interface BentoGridBlockData {
  type: "bento_grid";
  title?: string;
  subtitle?: string;
  columns?: "2" | "3" | "4" | number;
  cards?: BentoCard[];
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Shield,
  Layers,
  Rocket,
  Sparkles,
  CheckCircle2,
  Code2,
  Database,
  Server,
  Lock,
  Globe,
  Terminal,
  Cpu,
  Flame,
  Compass,
};

const DEFAULT_ICONS = [Zap, Shield, Layers, Rocket, Sparkles, CheckCircle2];

export function BentoGridBlock({ data }: { data: BentoGridBlockData }) {
  const cards = Array.isArray(data.cards) ? data.cards : [];

  if (cards.length === 0) return null;

  // Grid columns class based on settings (Mobile is always 1 col, md is 2 cols)
  const cols = String(data.columns || "3");
  const gridColsClass =
    cols === "2"
      ? "grid-cols-1 md:grid-cols-2"
      : cols === "4"
        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="w-full py-12 md:py-16">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        {(data.title || data.subtitle) && (
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
            {data.title && (
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {data.title}
              </h2>
            )}
            {data.subtitle && (
              <p className="text-muted-foreground text-sm sm:text-base">{data.subtitle}</p>
            )}
          </div>
        )}

        <div className={`grid ${gridColsClass} gap-6`}>
          {cards.map((card, index) => {
            const IconComponent =
              (card.icon && ICON_MAP[card.icon]) ||
              DEFAULT_ICONS[index % DEFAULT_ICONS.length] ||
              Sparkles;

            const spanSize = card.size;

            let spanClass = "col-span-1";
            if (spanSize === "2" || spanSize === "medium" || spanSize === "large") {
              spanClass = "col-span-1 md:col-span-2 lg:col-span-2";
            } else if (spanSize === "3" || spanSize === "full") {
              spanClass =
                cols === "4"
                  ? "col-span-1 md:col-span-2 lg:col-span-4"
                  : "col-span-1 md:col-span-2 lg:col-span-3";
            }

            const cardContent = (
              <>
                {/* Background ambient glow on hover */}
                <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary transition-transform duration-300 group-hover:scale-110">
                      <IconComponent className="size-5" />
                    </div>

                    {card.badge && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 tracking-wide">
                        {card.badge}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
                      {card.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>

                {card.url && (
                  <div className="pt-6 mt-4 border-t border-border/40 flex items-center gap-2 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                    <span>Learn more</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                )}
              </>
            );

            const cardClasses = `group relative rounded-3xl border border-border/70 bg-gradient-to-b from-card/80 to-card/40 p-6 md:p-8 backdrop-blur-md shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/40 flex flex-col justify-between overflow-hidden ${spanClass}`;

            if (card.url) {
              return (
                <Link key={index} href={card.url} className={cardClasses}>
                  {cardContent}
                </Link>
              );
            }

            return (
              <div key={index} className={cardClasses}>
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
