"use client";

import {
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from "@cms/admin-shell";
import { KeyRound, Plus } from "lucide-react";
import type { VaultItem } from "../types.js";
import { VaultTableRow } from "./VaultTableRow";

export interface VaultTableProps {
  isLoading: boolean;
  items: VaultItem[];
  search: string;
  selectedCategory: string;
  revealedPasswords: Record<string, string>;
  onReveal: (id: string) => void;
  onCopy: (id: string) => void;
  onEdit: (item: VaultItem) => void;
  onDelete: (item: VaultItem) => void;
  onNewCredential: () => void;
  page: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function VaultTable({
  isLoading,
  items,
  search,
  selectedCategory,
  revealedPasswords,
  onReveal,
  onCopy,
  onEdit,
  onDelete,
  onNewCredential,
  page,
  totalPages,
  totalCount,
  limit,
  onPageChange,
  onLimitChange,
}: VaultTableProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
      {isLoading ? (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
              <TableHead className="font-semibold">Account / Title</TableHead>
              <TableHead className="font-semibold">Username / Email</TableHead>
              <TableHead className="font-semibold">Password</TableHead>
              <TableHead className="font-semibold">URL</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-36" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-16 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 border border-border/80 text-muted-foreground mb-3.5 shadow-2xs">
            <KeyRound className="size-6 opacity-80" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {search || selectedCategory !== "all"
              ? "No credentials found"
              : "No credentials stored yet"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
            {search || selectedCategory !== "all"
              ? "No credentials match your search or filter criteria."
              : "Securely store your first website login, database secret, or server credential."}
          </p>
          {!search && selectedCategory === "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNewCredential}
              iconStart={<Plus className="size-3.5" />}
              className="mt-4 text-xs"
            >
              Add Credential
            </Button>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                <TableHead className="font-semibold">Account / Title</TableHead>
                <TableHead className="font-semibold">Username / Email</TableHead>
                <TableHead className="font-semibold">Password</TableHead>
                <TableHead className="font-semibold">URL</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <VaultTableRow
                  key={item.id}
                  item={item}
                  revealedPassword={item.id ? revealedPasswords[item.id] : undefined}
                  onReveal={onReveal}
                  onCopy={onCopy}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </TableBody>
          </Table>
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            limit={limit}
            onPageChange={onPageChange}
            onLimitChange={onLimitChange}
          />
        </>
      )}
    </div>
  );
}
