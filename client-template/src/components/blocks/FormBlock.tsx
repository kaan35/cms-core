"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@cms/client-sdk";
import type { FormDoc } from "@cms/plugin-forms-api";
import { AlertCircle, CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { CaptchaChallenge } from "./CaptchaChallenge";
import { useFormSubmit, type CaptchaResponse } from "./useFormSubmit";

export function FormBlock({ data }: { data: { formId: string } }) {
  const { formId } = data;

  const {
    data: formData,
    isLoading: formLoading,
    error: formError,
  } = useApi<{ form?: FormDoc } | FormDoc>(formId ? `/forms/${formId}` : null);

  const rawForm: unknown = formData
    ? typeof formData === "object" && "form" in formData && (formData as { form?: unknown }).form
      ? (formData as { form: unknown }).form
      : formData
    : undefined;

  const form: FormDoc | undefined =
    rawForm &&
    typeof rawForm === "object" &&
    "fields" in rawForm &&
    Array.isArray((rawForm as { fields?: unknown }).fields)
      ? (rawForm as FormDoc)
      : undefined;

  const isChallenge = form?.captchaProvider === "challenge";
  const {
    data: captchaData,
    mutate: refreshCaptcha,
    isLoading: captchaLoading,
  } = useApi<CaptchaResponse>(isChallenge && formId ? `/forms/${formId}/captcha` : null);

  const {
    inputData,
    captchaAnswer,
    setCaptchaAnswer,
    formState,
    handleInputChange,
    handleSubmit,
    resetForm,
  } = useFormSubmit({
    formId,
    form,
    isChallenge,
    captchaData,
    refreshCaptcha,
  });

  if (formLoading) {
    return (
      <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin" />
        <span>Loading form...</span>
      </div>
    );
  }

  if (formError || !form || !Array.isArray(form.fields)) {
    return (
      <div className="my-8 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-xs text-destructive">
        Form could not be loaded. Please verify the form definition.
      </div>
    );
  }

  return (
    <section className="relative py-12 sm:py-16">
      {/* Seamless ambient radial glow that naturally fades to transparent without hard clipping */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--primary)_0%,transparent_70%)] opacity-10 pointer-events-none -z-10" />

      <div className="container mx-auto max-w-xl px-4 sm:px-6">
        <div className="rounded-3xl border border-border/80 bg-white/95 dark:bg-card/75 backdrop-blur-xl p-6 sm:p-9 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/60 transition-all">
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="size-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <Mail className="size-4" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {form.title}
              </h3>
            </div>
            {form.description && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-0.5">
                {form.description}
              </p>
            )}
          </div>

          {formState.isSuccess ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center space-y-3 backdrop-blur-sm">
              <CheckCircle2 className="size-12 text-emerald-500 mx-auto" />
              <h4 className="text-base font-semibold text-emerald-400">
                {form.successMessage || "Thank you! Your submission has been received."}
              </h4>
              <button
                type="button"
                onClick={resetForm}
                className="mt-3 text-xs text-muted-foreground underline hover:text-foreground cursor-pointer font-medium transition-colors"
              >
                Submit another response
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {formState.errorMessage && (
                <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{formState.errorMessage}</span>
                </div>
              )}

              {(form.fields || []).map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <Label
                    htmlFor={field.name}
                    className="text-xs font-semibold text-foreground flex items-center justify-between"
                  >
                    <span>{field.label}</span>
                    {field.required && <span className="text-destructive font-bold">*</span>}
                  </Label>

                  {field.type === "textarea" ? (
                    <Textarea
                      id={field.name}
                      name={field.name}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={(inputData[field.name] as string) || ""}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      rows={4}
                    />
                  ) : field.type === "select" ? (
                    <select
                      id={field.name}
                      name={field.name}
                      required={field.required}
                      value={(inputData[field.name] as string) || ""}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="w-full rounded-xl border border-input bg-white dark:bg-zinc-900/60 px-3.5 py-2.5 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                    >
                      <option value="" className="bg-card text-muted-foreground">
                        Select an option...
                      </option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <label className="flex items-center gap-2.5 text-xs text-muted-foreground cursor-pointer pt-1">
                      <input
                        id={field.name}
                        name={field.name}
                        type="checkbox"
                        required={field.required}
                        checked={Boolean(inputData[field.name])}
                        onChange={(e) => handleInputChange(field.name, e.target.checked)}
                        className="rounded-md border-border text-primary focus:ring-primary size-4"
                      />
                      <span>{field.placeholder || field.label}</span>
                      {field.required && <span className="text-destructive font-bold">*</span>}
                    </label>
                  ) : (
                    <Input
                      id={field.name}
                      name={field.name}
                      type={
                        field.type === "email"
                          ? "email"
                          : field.type === "number"
                            ? "number"
                            : "text"
                      }
                      required={field.required}
                      placeholder={field.placeholder}
                      value={(inputData[field.name] as string) || ""}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                    />
                  )}
                </div>
              ))}

              {isChallenge && (
                <CaptchaChallenge
                  captchaData={captchaData}
                  captchaAnswer={captchaAnswer}
                  onAnswerChange={setCaptchaAnswer}
                  refreshCaptcha={refreshCaptcha}
                  isLoading={captchaLoading}
                />
              )}

              <Button
                type="submit"
                disabled={formState.isSubmitting}
                className="w-full h-11 rounded-xl text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-primary/30 active:scale-[0.99] transition-all cursor-pointer mt-2"
              >
                {formState.isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    <span>{form.submitButtonText || "Submit Form"}</span>
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
