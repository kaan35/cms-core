"use client";

import { getClientApiUrl } from "@/lib/config";
import { CheckCircle, Loader2, Send } from "lucide-react";
import { useState } from "react";

interface Field {
  name: string;
  type: "text" | "email" | "textarea" | "number";
  label: string;
  placeholder?: string;
  required: boolean;
}

interface FormProps {
  formId: string;
  name: string;
  fields: Field[];
}

export default function DynamicForm({ formId, name, fields }: FormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    setSuccess(false);

    const clientApiUrl = getClientApiUrl();
    try {
      const res = await fetch(`${clientApiUrl}/forms/${formId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          alert(data.message || "Submission failed");
        }
        return;
      }

      setSuccess(true);
      setFormData({});
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (fieldName: string, value: string) => {
    setFormData({
      ...formData,
      [fieldName]: value,
    });
    // Clear validation error for this field
    setErrors(errors.filter((e) => e.field !== fieldName));
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center text-emerald-400">
        <CheckCircle className="h-12 w-12 mb-3 text-emerald-500 animate-bounce" />
        <h4 className="font-bold text-lg text-foreground">Gönderim Başarılı!</h4>
        <p className="text-sm mt-1 text-emerald-500/80">
          Form başarıyla kaydedildi. Sizinle en kısa sürede iletişime geçeceğiz.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-4 text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-foreground cursor-pointer transition"
        >
          Yeni Mesaj Gönder
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-8 shadow-xl w-full max-w-xl mx-auto text-left transition duration-200">
      <h3 className="text-xl font-bold mb-6 text-foreground border-b border-card-border pb-3">
        {name}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        {fields.map((field) => {
          const fieldError = errors.find((e) => e.field === field.name);
          const isTextArea = field.type === "textarea";

          return (
            <div key={field.name}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              <div className="mt-2">
                {isTextArea ? (
                  <textarea
                    rows={4}
                    required={field.required}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-full rounded-lg border border-input-border bg-input px-4 py-2.5 text-sm text-foreground placeholder-muted outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-150"
                    placeholder={field.placeholder || `${field.label} giriniz`}
                  />
                ) : (
                  <input
                    type={
                      field.type === "email" ? "email" : field.type === "number" ? "number" : "text"
                    }
                    required={field.required}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-full rounded-lg border border-input-border bg-input px-4 py-2.5 text-sm text-foreground placeholder-muted outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-150"
                    placeholder={field.placeholder || `${field.label} giriniz`}
                  />
                )}
              </div>
              {fieldError && <p className="mt-1 text-xs text-red-400">{fieldError.message}</p>}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Gönder
            </>
          )}
        </button>
      </form>
    </div>
  );
}
