"use client";

import { StatCard } from "@cms/admin-shell";
import { Clock, FolderLock, KeyRound } from "lucide-react";

export interface VaultStatsCardsProps {
  total: number;
  categoriesCount: number;
  recentCount: number;
  staleCount: number;
}

export function VaultStatsCards({
  total,
  categoriesCount,
  recentCount,
  staleCount,
}: VaultStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        title="Total Credentials"
        value={total}
        description="Stored encrypted credentials"
        icon={KeyRound}
      />
      <StatCard
        title="Categories"
        value={categoriesCount}
        description="Account groupings"
        icon={FolderLock}
      />
      <StatCard
        title="Recently Changed"
        value={recentCount}
        description={staleCount > 0 ? `${staleCount} require rotation` : "All passwords up to date"}
        icon={Clock}
      />
    </div>
  );
}
