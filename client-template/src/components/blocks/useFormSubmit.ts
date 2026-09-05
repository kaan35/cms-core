"use client";

import { api } from "@cms/client-sdk";
import type { FormDoc } from "@cms/plugin-forms-api";
import * as React from "react";
import { toast } from "sonner";

export interface CaptchaResponse {
  captchaRequired?: boolean;
  captchaToken?: string;
  token?: string;
  question?: string;
  challengeType?: string;
}

interface UseFormSubmitOptions {
  formId: string;
  form: FormDoc | undefined;
  isChallenge: boolean;
  captchaData: CaptchaResponse | undefined;
  refreshCaptcha: () => void;
}

export function useFormSubmit({
  formId,
  form,
  isChallenge,
  captchaData,
  refreshCaptcha,
}: UseFormSubmitOptions) {
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

  const resetForm = () => {
    setInputData({});
    setCaptchaAnswer("");
    setFormState({ isSubmitting: false, isSuccess: false, errorMessage: null });
    if (isChallenge) {
      refreshCaptcha();
    }
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

  return {
    inputData,
    captchaAnswer,
    setCaptchaAnswer,
    formState,
    handleInputChange,
    handleSubmit,
    resetForm,
  };
}
