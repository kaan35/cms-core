import { FormBlock } from "@/components/blocks/FormBlock";
import { api, type FormDoc } from "@cms/client-sdk";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface FormPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: FormPageProps): Promise<Metadata> {
  const { slug } = await params;
  const res = await api.get<{ form: FormDoc }>(`/forms/${slug}`).catch(() => null);
  const form = res?.form;

  if (!form) {
    return { title: "Form Not Found" };
  }

  return {
    title: form.title,
    description: form.description || `Submit ${form.title}`,
  };
}

export default async function ClientFormPage({ params }: FormPageProps) {
  const { slug } = await params;
  const res = await api.get<{ form: FormDoc }>(`/forms/${slug}`).catch(() => null);
  const form = res?.form;

  if (!form) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-xl py-12 px-4 sm:px-6">
      <FormBlock data={{ formId: form.id }} />
    </div>
  );
}
