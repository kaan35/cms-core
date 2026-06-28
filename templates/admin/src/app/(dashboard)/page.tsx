"use client";

import React from "react";
import { useApiQuery } from "@/hooks/useApi";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import {
  FileText,
  BookOpen,
  ClipboardList,
  Settings,
  Plug,
  Activity,
  ArrowRight,
  Sparkles,
  Server,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const router = useRouter();

  // Fetch counts & data
  const { data: pagesData } = useApiQuery<any>("/pages");
  const { data: blogData } = useApiQuery<any>("/blog");
  const { data: formsData } = useApiQuery<any>("/forms");
  const { data: pluginsData } = useApiQuery<any>("/plugins");
  const { data: healthData } = useApiQuery<any>("/health");

  const totalPages = pagesData?.pages?.length || 0;
  const totalPosts = blogData?.items?.length || 0;
  const totalForms = formsData?.forms?.length || 0;
  const totalPlugins = pluginsData?.plugins?.length || 0;
  const activePlugins = pluginsData?.plugins?.filter((p: any) => p.isEnabled)?.length || 0;

  const dbStatus = healthData?.services?.database === "connected";
  const cacheStatus = healthData?.services?.cache === "connected";

  return (
    <div className="space-y-8">
      {/* Welcome Hero */}
      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-zinc-900/40 p-8 backdrop-blur-md">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Sparkles className="h-32 w-32 text-blue-500" />
        </div>
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Welcome to Antigravity CMS
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-6">
            A high-performance modular headless CMS built on Fastify, Next.js, and MongoDB.
            Manage your pages, blog posts, form collections, and plugins all from one unified, real-time control panel.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => router.push("/pages")} variant="primary" icon={ArrowRight}>
              Go to Pages
            </Button>
            <Button onClick={() => router.push("/settings")} variant="secondary" icon={Settings}>
              Manage Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 hover:border-blue-500/20 transition duration-150">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pages</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold">{totalPages}</p>
          <p className="text-xs text-zinc-400 mt-1">Structured templates</p>
        </div>

        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 hover:border-green-500/20 transition duration-150">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Blog Posts</span>
            <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold">{totalPosts}</p>
          <p className="text-xs text-zinc-400 mt-1">Articles & updates</p>
        </div>

        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 hover:border-purple-500/20 transition duration-150">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Forms</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold">{totalForms}</p>
          <p className="text-xs text-zinc-400 mt-1">Active feedback hooks</p>
        </div>

        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 hover:border-yellow-500/20 transition duration-150">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Plugins</span>
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
              <Plug className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold">
            {activePlugins} <span className="text-zinc-500 text-sm">/ {totalPlugins}</span>
          </p>
          <p className="text-xs text-zinc-400 mt-1">Enabled capabilities</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 md:col-span-1 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              System Health
            </h3>
            <p className="text-xs text-zinc-500">Live API connectivity checks</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <Server className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium">Core Database</span>
              </div>
              <div className="flex items-center gap-1.5">
                {dbStatus ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-green-400 font-semibold">Online</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-xs text-red-400 font-semibold">Offline</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium">Redis Cache</span>
              </div>
              <div className="flex items-center gap-1.5">
                {cacheStatus ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-green-400 font-semibold">Online</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-xs text-red-400 font-semibold">Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Technical Architecture Info */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 md:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-1">
              Architecture Summary
            </h3>
            <p className="text-xs text-zinc-500">How the monorepo fits together</p>
          </div>
          <div className="text-sm text-zinc-300 space-y-3 leading-relaxed">
            <p>
              Antigravity operates as a highly modular monorepo system. Each service and plugin is
              fully self-contained:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs">
              <li>
                <strong className="text-zinc-200">@cms/core</strong>: Event bus hook manager, Audit
                log dispatching, and global plugin guard preHandlers.
              </li>
              <li>
                <strong className="text-zinc-200">Fastify REST API</strong>: Lightweight, blazing
                fast endpoint routes with automatic Swagger/OpenAPI docs generation.
              </li>
              <li>
                <strong className="text-zinc-200">Pluggable UI Extension</strong>: Sub-pages and API
                connections are decoupled, registering dynamically based on the state in database.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
