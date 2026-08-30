"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, useApi } from "@cms/client-sdk";
import type { FormDoc } from "@cms/plugin-forms-api";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Send } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

interface CaptchaResponse {
  captchaRequired?: boolean;
  captchaToken?: string;
  token?: string;
  question?: string;
  challengeType?: string;
}

export function FormBlock({ data }: { data: { formId: string } }) {
  const { formId } = data;

  // 1. Fetch form definition via useApi
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

  // 2. Fetch captcha challenge if needed
  const isChallenge = form?.captchaProvider === "challenge";
  const {
    data: captchaData,
    mutate: refreshCaptcha,
    isLoading: captchaLoading,
  } = useApi<CaptchaResponse>(isChallenge && formId ? `/forms/${formId}/captcha` : null);

  // 3. Form States
  const [inputData, setInputData] = React.useState<Record<string, unknown>>({});
  const [captchaAnswer, setCaptchaAnswer] = React.useState("");
  const [formState, setFormState] = React.useState<{
    isSubmitting: boolean;
    isSuccess: boolean;
    errorMessage: string | null;
  }>({
    isSubmitting: false,
    isSuccess: false,
    errorMessage: null,
  });

  const handleInputChange = (name: string, value: unknown) => {
    setInputData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    setFormState({ isSubmitting: true, isSuccess: false, errorMessage: null });

    const payload: Record<string, unknown> = { ...inputData };
    const token = captchaData?.captchaToken || captchaData?.token;
    if (isChallenge) {
      if (!token) {
        setFormState({
          isSubmitting: false,
          isSuccess: false,
          errorMessage: "Security verification is loading, please try again in a moment.",
        });
        return;
      }
      payload.captchaToken = token;
      payload.captchaAnswer = captchaAnswer;
    }

    try {
      await api.post(`/forms/${formId}/submissions`, payload);

      setFormState({
        isSubmitting: false,
        isSuccess: true,
        errorMessage: null,
      });
      setInputData({});
      setCaptchaAnswer("");
      toast.success(form.successMessage || "Form submitted successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission error occurred.";
      setFormState({
        isSubmitting: false,
        isSuccess: false,
        errorMessage: msg,
      });
      setCaptchaAnswer("");
      toast.error(msg);
      if (isChallenge) {
        refreshCaptcha();
      }
    }
  };

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
    <section className="py-12">
      <div className="container mx-auto max-w-xl px-4 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-tight text-foreground">{form.title}</h3>
            {form.description && (
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                {form.description}
              </p>
            )}
          </div>

          {formState.isSuccess ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
              <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-semibold text-emerald-400">
                {form.successMessage || "Thank you! Your submission has been received."}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setInputData({});
                  setCaptchaAnswer("");
                  setFormState({ isSubmitting: false, isSuccess: false, errorMessage: null });
                  if (isChallenge) {
                    refreshCaptcha();
                  }
                }}
                className="mt-2 text-xs text-muted-foreground underline hover:text-foreground cursor-pointer"
              >
                Submit another response
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {formState.errorMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
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
                    {field.required && <span className="text-destructive">*</span>}
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
                      className="w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="" className="bg-background text-muted-foreground">
                        Select an option...
                      </option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt} className="bg-background text-foreground">
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        id={field.name}
                        name={field.name}
                        type="checkbox"
                        required={field.required}
                        checked={Boolean(inputData[field.name])}
                        onChange={(e) => handleInputChange(field.name, e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary size-4"
                      />
                      <span>{field.placeholder || field.label}</span>
                      {field.required && <span className="text-destructive">*</span>}
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

              {/* Challenge Captcha Support */}
              {isChallenge && (
                <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <Label htmlFor="captchaAnswer" className="font-semibold text-foreground">
                      Security Verification
                    </Label>
                    <button
                      type="button"
                      onClick={() => refreshCaptcha()}
                      disabled={captchaLoading}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] cursor-pointer"
                      title="Refresh verification challenge"
                    >
                      <RefreshCw className={`size-3 ${captchaLoading ? "animate-spin" : ""}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {/* Anti-Scraping / Anti-Copy Challenge Display */}
                  <div
                    className="select-none font-mono font-bold text-sm tracking-wider text-primary bg-background/90 px-4 py-3 rounded-xl border border-border/80 flex items-center justify-center cursor-not-allowed shadow-inner"
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      MozUserSelect: "none",
                      msUserSelect: "none",
                    }}
                    aria-label="Captcha security challenge"
                  >
                    {captchaData?.question ? (
                      (() => {
                        const isCode = captchaData.question.startsWith("Enter code:");
                        const text = isCode
                          ? captchaData.question.replace(/^Enter code:\s*/i, "")
                          : captchaData.question.replace(/\*/g, "×");

                        if (isCode) {
                          return (
                            <div className="flex items-center gap-2 tracking-[0.25em] text-base font-black uppercase text-blue-400 bg-blue-950/40 px-5 py-2 rounded-lg border border-blue-500/30">
                              {text.split("").map((char, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block transform hover:scale-110 transition-transform"
                                >
                                  {char}
                                </span>
                              ))}
                            </div>
                          );
                        }

                        return <span>What is {text} ?</span>;
                      })()
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Loading challenge...</span>
                      </div>
                    )}
                  </div>

                  <Input
                    id="captchaAnswer"
                    name="captchaAnswer"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder={
                      captchaData?.question?.startsWith("Enter code:")
                        ? "Enter the code shown above..."
                        : "Enter the calculated result..."
                    }
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                  />
                </div>
              )}

              <Button type="submit" disabled={formState.isSubmitting} className="w-full">
                {formState.isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
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
