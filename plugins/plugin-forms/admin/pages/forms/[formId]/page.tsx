"use client";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { useApiPagination, useApiQuery } from "@/hooks/useApi";
import { ArrowLeft, Calendar, Database, Pencil } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

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
}

interface Submission {
  _id: string;
  formId: string;
  data: Record<string, any>;
  createdAt: string;
}

export default function FormSubmissionsPage() {
  const router = useRouter();
  const params = useParams();
  const formId = params.formId as string;

  const { data: formData, isLoading: formLoading } = useApiQuery<{ form: Form }>(
    `/forms/${formId}`,
  );
  const form = formData?.form;

  const {
    items: submissions,
    meta,
    page,
    setPage,
    nextPage,
    prevPage,
    isLoading: subsLoading,
  } = useApiPagination<Submission>(`/forms/${formId}/submissions`, {
    initialLimit: 10,
  });

  if (formLoading) return <Loading isFullScreen />;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[{ label: "Forms & Submissions", href: "/forms" }, { label: form?.name || formId }]}
      />

      <PageHeader
        title={`Submissions: ${form?.name}`}
        description={`Form ID: ${formId}`}
        actions={
          <>
            <Button
              variant="secondary"
              icon={Pencil}
              onClick={() => router.push(`/forms/${formId}/edit`)}
            >
              Edit Form
            </Button>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => router.push("/forms")}>
              Back to Forms
            </Button>
          </>
        }
      />

      {/* Schema Fields */}
      {form && (
        <Card
          title="Form Schema Fields"
          description="Active field keys and validation rules for this form submission schema"
        >
          <div className="flex flex-wrap gap-3">
            {form.fields.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 border border-border text-xs"
              >
                <span className="font-semibold text-foreground">{f.label}</span>
                <span className="text-muted-foreground font-mono">({f.type})</span>
                {f.required && <span className="text-destructive text-[10px]">*</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Submissions */}
      {subsLoading ? (
        <Loading isFullScreen />
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No submissions yet"
          description="Submissions will appear here once visitors fill out this form."
        />
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <Card key={sub._id}>
              <CardHeader className="flex items-center justify-between gap-4 border-b border-border">
                <span className="font-mono text-xs text-muted-foreground">ID: {sub._id}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Calendar className="h-3 w-3" />
                  {new Date(sub.createdAt).toLocaleString()}
                </span>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(sub.data).map(([key, val]) => {
                    const field = form?.fields.find((f) => f.name === key);
                    const label = field ? field.label : key;
                    return (
                      <div key={key} className="space-y-1">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {label}
                        </span>
                        <span className="text-sm text-foreground break-words">{String(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        meta={meta}
        page={page}
        onPageChange={setPage}
        onNext={nextPage}
        onPrev={prevPage}
        itemLabel="submissions"
      />
    </div>
  );
}
