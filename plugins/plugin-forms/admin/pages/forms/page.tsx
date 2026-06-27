"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/Table";
import { useApiQuery, useApiPagination } from "@/hooks/useApi";
import { ArrowLeft, Calendar, ClipboardList, Database, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

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

interface Submission {
  _id: string;
  formId: string;
  data: Record<string, any>;
  createdAt: string;
}

export default function FormsPage() {
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  // Fetch forms list (no pagination needed)
  const { data: formsData, isLoading } = useApiQuery<{ forms: Form[] }>("/forms");
  const forms = formsData?.forms || [];

  // Fetch submissions with pagination (only when form is selected)
  const {
    items: submissions,
    meta,
    page,
    setPage,
    nextPage,
    prevPage,
    isLoading: isLoadingSubs,
  } = useApiPagination<Submission>(
    `/forms/${selectedForm?.formId}/submissions`,
    {
      enabled: !!selectedForm,
      initialLimit: 10,
    }
  );

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  return (
    <div className="space-y-6">
      {/* Title / Action bar */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {selectedForm ? `Submissions: ${selectedForm.name}` : "Forms & Submissions"}
          </h1>
          <p className="text-sm text-zinc-400">
            {selectedForm
              ? `Viewing form responses for formId: ${selectedForm.formId}`
              : "Monitor dynamic forms and view user submissions"}
          </p>
        </div>

        {selectedForm && (
          <Button variant="secondary" onClick={() => setSelectedForm(null)} icon={ArrowLeft}>
            Back to Forms
          </Button>
        )}
      </div>

      {selectedForm ? (
        /* Submissions List View with Pagination */
        <div className="space-y-6">
          {/* Form fields details card */}
          <Card
            title="Form Schema Fields"
            description="Active field keys and validation rules for this form submission schema"
          >
            <div className="flex flex-wrap gap-3">
              {selectedForm.fields.map((f) => (
                <div
                  key={f.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/5 text-xs"
                >
                  <span className="font-semibold text-white">{f.label}</span>
                  <span className="text-zinc-500 font-mono">({f.type})</span>
                  {f.required && <span className="text-red-500 text-[10px]">*</span>}
                </div>
              ))}
            </div>
          </Card>

          {/* Pagination Info */}
          {meta && (
            <div className="flex items-center justify-between text-sm text-zinc-400">
              <span>
                Showing {submissions.length} of {meta.total} submissions
              </span>
              <span>
                Page {page} of {meta.totalPages}
              </span>
            </div>
          )}

          {isLoadingSubs ? (
            <Loading isFullScreen />
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-white/5 bg-zinc-900/20">
              <Database className="h-10 w-10 text-zinc-700 mb-2" />
              <p className="text-zinc-400 text-sm">No submissions received yet for this form</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <Card key={sub._id}>
                  <div className="flex justify-between items-center text-xs text-zinc-400 border-b border-white/5 pb-2.5 mb-4">
                    <span className="font-mono">ID: {sub._id}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(sub.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(sub.data).map(([key, val]) => {
                      const field = selectedForm.fields.find((f) => f.name === key);
                      const label = field ? field.label : key;
                      return (
                        <div key={key} className="space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            {label}
                          </span>
                          <span className="text-sm text-white break-words">{String(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={prevPage}
                isDisabled={page === 1}
                icon={ChevronLeft}
              >
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`
                        px-3 py-1.5 rounded text-sm font-medium transition-colors
                        ${page === pageNum 
                          ? "bg-violet-600 text-white" 
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }
                      `}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {meta.totalPages > 5 && (
                  <span className="px-2 text-zinc-500">...</span>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={nextPage}
                isDisabled={page === meta.totalPages}
                icon={ChevronRight}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Forms List View */
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>Form Name</TableCell>
              <TableCell isHeader>Form ID</TableCell>
              <TableCell isHeader>Fields</TableCell>
              <TableCell isHeader>Created</TableCell>
              <TableCell isHeader className="text-right">
                Actions
              </TableCell>
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
                  <TableCell className="text-zinc-400 text-sm">
                    {form.fields.length} fields
                  </TableCell>
                  <TableCell className="text-xs text-zinc-400">
                    {new Date(form.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="secondary" onClick={() => setSelectedForm(form)}>
                      View Submissions
                    </Button>
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