"use client";

import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/Table";
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
  const { data: formsData, isLoading, isRefreshing, refetch } = useApiQuery<{ forms: Form[] }>("/forms");
  const forms = formsData?.forms || [];

  if (isLoading) return <Loading isFullScreen />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forms & Submissions</h1>
          <p className="text-sm text-zinc-400">Manage dynamic forms and view user submissions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => refetch()} isDisabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => router.push("/forms/new")} icon={Plus}>
            Create Form
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableCell isHeader>Form Name</TableCell>
            <TableCell isHeader>Form ID</TableCell>
            <TableCell isHeader>Fields</TableCell>
            <TableCell isHeader>Created</TableCell>
            <TableCell isHeader className="text-right">Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {forms.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-zinc-500">
                <ClipboardList className="h-10 w-10 text-zinc-700 mx-auto mb-2" />
                No forms available
              </TableCell>
            </TableRow>
          ) : (
            forms.map((form) => (
              <TableRow key={form.formId}>
                <TableCell className="font-semibold text-white">{form.name}</TableCell>
                <TableCell className="font-mono text-zinc-400 text-sm">{form.formId}</TableCell>
                <TableCell className="text-zinc-400 text-sm">{form.fields.length} fields</TableCell>
                <TableCell className="text-xs text-zinc-400">
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
    </div>
  );
}