"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { useApiQuery } from "@/hooks/useApi";
import { ClipboardList, Eye, Pencil, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface FormField {
  name: string;
  type: string;
  label: string;
  required: boolean;
}

interface Form {
  formId: string;
  name: string;
  fields: FormField[];
  createdAt: string;
}

export default function FormsPage() {
  const router = useRouter();
  const {
    data: formsData,
    isLoading,
    isRefreshing,
    error,
    refetch,
  } = useApiQuery<{ forms: Form[] }>("/forms");
  const forms = formsData?.forms || [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        accent="violet"
        title="Forms & Submissions"
        description="Manage dynamic forms and view user submissions"
        actions={
          <>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => refetch()}
              isDisabled={isRefreshing}
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => router.push("/forms/new")} icon={Plus}>
              Create Form
            </Button>
          </>
        }
      />

      <ErrorMessage error={error} fallback="Failed to load forms" />

      {isLoading || isRefreshing ? (
        <SkeletonTable rows={5} columns={5} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form Name</TableHead>
              <TableHead className="hidden sm:table-cell">Form ID</TableHead>
              <TableHead className="hidden md:table-cell">Fields</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState
                    icon={ClipboardList}
                    title="No forms available"
                    description="Create a form to start collecting submissions."
                    className="border-0 rounded-none"
                  />
                </TableCell>
              </TableRow>
            ) : (
              forms.map((form) => (
                <TableRow key={form.formId}>
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                        <ClipboardList className="h-4 w-4" />
                      </div>
                      <span className="truncate">{form.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-sm hidden sm:table-cell">
                    {form.formId}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                    {form.fields.length} fields
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                    {new Date(form.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Eye}
                        onClick={() => router.push(`/forms/${form.formId}`)}
                      >
                        View Submissions
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Pencil}
                        onClick={() => router.push(`/forms/${form.formId}/edit`)}
                      >
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
