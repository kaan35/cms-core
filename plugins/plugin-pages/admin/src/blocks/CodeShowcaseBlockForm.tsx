"use client";

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@cms/admin-shell";
import { ArrowDown, ArrowUp, Code2, Plus, Terminal, Trash2 } from "lucide-react";

export interface CodeTabItem {
  label: string;
  language: string;
  code: string;
}

export interface CodeShowcaseBlockData {
  type: "code_showcase";
  title?: string | undefined;
  subtitle?: string | undefined;
  tabs: CodeTabItem[];
}

export interface CodeShowcaseBlockFormProps {
  data: CodeShowcaseBlockData;
  onChange: (data: CodeShowcaseBlockData) => void;
}

const COMMON_LANGUAGES = [
  { id: "bash", label: "Bash / cURL" },
  { id: "typescript", label: "TypeScript / JavaScript" },
  { id: "json", label: "JSON" },
  { id: "python", label: "Python" },
  { id: "go", label: "Go" },
  { id: "html", label: "HTML / CSS" },
];

export function CodeShowcaseBlockForm({ data, onChange }: CodeShowcaseBlockFormProps) {
  const tabs = Array.isArray(data.tabs) ? data.tabs : [];

  const handleAddTab = () => {
    const newTab: CodeTabItem = {
      label: "TypeScript",
      language: "typescript",
      code: `const response = await fetch("/api/pages");\nconst data = await response.json();`,
    };
    onChange({
      ...data,
      tabs: [...tabs, newTab],
    });
  };

  const handleUpdateTab = (index: number, patch: Partial<CodeTabItem>) => {
    const updated = tabs.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange({ ...data, tabs: updated });
  };

  const handleRemoveTab = (index: number) => {
    onChange({ ...data, tabs: tabs.filter((_, i) => i !== index) });
  };

  const handleMoveTab = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tabs.length) return;
    const updated = [...tabs];
    const temp = updated[index];
    const target = updated[targetIndex];
    if (temp && target) {
      updated[index] = target;
      updated[targetIndex] = temp;
      onChange({ ...data, tabs: updated });
    }
  };

  return (
    <div className="space-y-5">
      {/* Section Headline */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pb-2 border-b border-border/60">
        <div className="space-y-1.5">
          <Label htmlFor="code-title">Section Headline (Optional)</Label>
          <Input
            id="code-title"
            placeholder="e.g. Developer Quickstart"
            value={data.title || ""}
            onChange={(e) => onChange({ ...data, title: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="code-subtitle">Section Subtitle (Optional)</Label>
          <Input
            id="code-subtitle"
            placeholder="e.g. Fetch CMS pages using our REST APIs."
            value={data.subtitle || ""}
            onChange={(e) => onChange({ ...data, subtitle: e.target.value || undefined })}
          />
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="size-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Code Tabs ({tabs.length})</span>
        </div>
        <Button type="button" variant="outline" onClick={handleAddTab} iconStart={<Plus />}>
          Add Code Tab
        </Button>
      </div>

      {/* Tabs List */}
      {tabs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-6 text-center space-y-2">
          <Terminal className="size-5 text-muted-foreground mx-auto opacity-50" />
          <p className="text-xs text-muted-foreground">No code tabs added yet.</p>
          <Button type="button" variant="outline" onClick={handleAddTab} iconStart={<Plus />}>
            Add First Tab
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tabs.map((tab, index) => (
            <div
              key={index}
              className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3 transition-all"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveTab(index, "up")}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === tabs.length - 1}
                      onClick={() => handleMoveTab(index, "down")}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground font-semibold">
                    Tab #{index + 1} ({tab.label || "Untitled"})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveTab(index)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  title="Delete Tab"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Tab Label *</Label>
                  <Input
                    placeholder="e.g. cURL, Bash, TypeScript"
                    value={tab.label}
                    onChange={(e) => handleUpdateTab(index, { label: e.target.value })}
                    className="h-8 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Syntax / Language</Label>
                  <Select
                    value={tab.language || "bash"}
                    onValueChange={(val) => handleUpdateTab(index, { language: val || "bash" })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.id} value={lang.id}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Source Code Snippet *</Label>
                <Textarea
                  rows={4}
                  placeholder="Paste or write your code snippet..."
                  value={tab.code}
                  onChange={(e) => handleUpdateTab(index, { code: e.target.value })}
                  className="font-mono text-xs bg-zinc-950/80 text-zinc-100 border-zinc-800"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
