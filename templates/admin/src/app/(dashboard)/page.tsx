"use client";

import { Card } from "@/components/ui/Card";
import { SkeletonStatCards } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { useApiQuery } from "@/hooks/useApi";
import {
  Activity,
  BookOpen,
  ClipboardList,
  FileText,
  Plug,
  Plus,
  Server,
  Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface PluginSummary {
  name: string;
  isEnabled: boolean;
}

interface HealthResponse {
  services?: {
    database?: string;
    cache?: string;
  };
}

const QUICK_ACTIONS = [
  {
    description: "Add a structured page",
    href: "/pages/new",
    icon: FileText,
    label: "New Page",
  },
  {
    description: "Publish an article",
    href: "/blog/new",
    icon: BookOpen,
    label: "New Blog Post",
  },
  {
    description: "Define a permission set",
    href: "/roles/new",
    icon: Shield,
    label: "New Role",
  },
];

export default function DashboardOverviewPage() {
  const router = useRouter();

  // Fetch counts & data
  const { data: pagesData } = useApiQuery<{ pages: unknown[] }>("/pages");
  const { data: blogData } = useApiQuery<{ items: unknown[] }>("/blog");
  const { data: formsData } = useApiQuery<{ forms: unknown[] }>("/forms");
  const { data: pluginsData } = useApiQuery<{ plugins: PluginSummary[] }>(
    "/plugins",
  );
  const { data: healthData } = useApiQuery<HealthResponse>("/health");

  const totalPages = pagesData?.pages?.length || 0;
  const totalPosts = blogData?.items?.length || 0;
  const totalForms = formsData?.forms?.length || 0;
  const totalPlugins = pluginsData?.plugins?.length || 0;
  const activePlugins =
    pluginsData?.plugins?.filter((p) => p.isEnabled)?.length || 0;

  const dbStatus = healthData?.services?.database === "connected";
  const cacheStatus = healthData?.services?.cache === "connected";

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      {!pagesData && !blogData && !formsData && !pluginsData ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Pages"
            value={totalPages}
            subtext="Structured templates"
            icon={FileText}
            accent="primary"
          />
          <StatCard
            label="Blog Posts"
            value={totalPosts}
            subtext="Articles & updates"
            icon={BookOpen}
            accent="teal"
          />
          <StatCard
            label="Forms"
            value={totalForms}
            subtext="Active feedback hooks"
            icon={ClipboardList}
            accent="violet"
          />
          <StatCard
            label="Plugins"
            value={
              <>
                {activePlugins}{" "}
                <span className="text-muted-foreground text-sm">
                  / {totalPlugins}
                </span>
              </>
            }
            subtext="Enabled capabilities"
            icon={Plug}
            accent="amber"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          title="Quick Actions"
          description="Jump straight into creating content"
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.href}
                  type="button"
                  onClick={() => router.push(action.href)}
                  className="group flex flex-col items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/40 transition duration-150 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition duration-150">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      {action.label}
                      <Plus className="h-3 w-3 text-muted-foreground group-hover:text-primary transition duration-150" />
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {action.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* System Health */}
        <Card title="System Health" description="Live API connectivity checks">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-md bg-muted/60 border border-border">
              <div className="flex items-center gap-2.5">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground/80">
                  Core Database
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {dbStatus ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span className="text-xs text-success font-semibold">
                      Online
                    </span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-destructive" />
                    <span className="text-xs text-destructive font-semibold">
                      Offline
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-muted/60 border border-border">
              <div className="flex items-center gap-2.5">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground/80">
                  Redis Cache
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {cacheStatus ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span className="text-xs text-success font-semibold">
                      Online
                    </span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-destructive" />
                    <span className="text-xs text-destructive font-semibold">
                      Offline
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
