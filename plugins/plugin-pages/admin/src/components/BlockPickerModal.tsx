"use client";

import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  InputSearchField,
} from "@cms/admin-shell";
import { Plus } from "lucide-react";
import * as React from "react";
import { BLOCK_CATALOG, type BlockDefinition } from "./blockCatalog";

interface BlockPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBlock: (def: BlockDefinition) => void;
}

export function BlockPickerModal({ open, onOpenChange, onSelectBlock }: BlockPickerModalProps) {
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");

  const categories = ["All", "Marketing", "Media", "Content", "Forms", "Feed"];

  const filteredCatalog = React.useMemo(() => {
    return BLOCK_CATALOG.filter((item) => {
      const matchCat = selectedCategory === "All" || item.category === selectedCategory;
      const matchQuery =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.type.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [search, selectedCategory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-2">
          <DialogTitle>Add Content Block</DialogTitle>
          <DialogDescription className="text-xs">
            Choose a responsive block from the layout catalog to inject into your page.
          </DialogDescription>
        </DialogHeader>

        {/* Search & Category Filter */}
        <div className="space-y-3 py-2">
          <InputSearchField
            placeholder="Search blocks by name or description..."
            value={search}
            onSearchChange={setSearch}
            containerClassName="w-full max-w-none"
            className="text-xs"
          />

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1 py-1">
          {filteredCatalog.map((def) => {
            const Icon = def.icon;
            return (
              <div
                key={def.type}
                onClick={() => onSelectBlock(def)}
                className="group flex flex-col justify-between p-4 rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer text-left"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="size-4" />
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                      {def.category}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                      {def.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {def.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Add block</span>
                  <Plus className="size-3" />
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
