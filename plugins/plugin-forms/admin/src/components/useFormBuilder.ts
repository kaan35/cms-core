import { slugify, toSnakeCase, toast, useSaveShortcut } from "@cms/admin-shell";
import * as React from "react";

export type FormFieldType = "text" | "email" | "textarea" | "number" | "select" | "checkbox";

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string | undefined;
  options?: string[] | undefined;
}

export interface FormDoc {
  id: string;
  title: string;
  slug: string;
  description?: string | undefined;
  fields: FormField[];
  captchaProvider: "none" | "challenge";
  challengeType: "alphanumeric" | "math";
  submitButtonText: string;
  successMessage: string;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface FormBuilderState {
  title: string;
  slug: string;
  description: string;
  captchaProvider: "none" | "challenge";
  challengeType: "alphanumeric" | "math";
  submitButtonText: string;
  successMessage: string;
  fields: FormField[];
}

export function useFormBuilder(
  initialData: Partial<FormDoc> | undefined,
  onSave: (data: Omit<FormDoc, "id" | "createdAt" | "updatedAt">) => Promise<void>,
) {
  const [inputData, setInputData] = React.useState<FormBuilderState>({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    captchaProvider: (initialData?.captchaProvider || "challenge") as "none" | "challenge",
    challengeType: (initialData?.challengeType || "alphanumeric") as "alphanumeric" | "math",
    submitButtonText: initialData?.submitButtonText || "Submit",
    successMessage: initialData?.successMessage || "Thank you for your submission.",
    fields: (Array.isArray(initialData?.fields) && initialData.fields.length > 0
      ? initialData.fields
      : [
          {
            name: "full_name",
            label: "Full Name",
            type: "text" as FormFieldType,
            required: true,
            placeholder: "Jane Doe",
          },
          {
            name: "email",
            label: "Email Address",
            type: "email" as FormFieldType,
            required: true,
            placeholder: "jane@example.com",
          },
          {
            name: "message",
            label: "Message",
            type: "textarea" as FormFieldType,
            required: false,
            placeholder: "How can we help you today?",
          },
        ]) as FormField[],
  });

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = React.useState(
    Boolean(initialData?.slug),
  );

  // Field Edit Dialog state
  const [editingFieldIndex, setEditingFieldIndex] = React.useState<number | null>(null);
  const [fieldModalOpen, setFieldModalOpen] = React.useState(false);
  const [tempField, setTempField] = React.useState<FormField>({
    name: "",
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    options: [],
  });
  const [rawOptions, setRawOptions] = React.useState("");

  const handleTitleChange = (val: string) => {
    setInputData((prev) => ({
      ...prev,
      title: val,
      slug: isSlugManuallyEdited ? prev.slug : slugify(val),
    }));
  };

  const handleSlugChange = (val: string) => {
    setIsSlugManuallyEdited(true);
    setInputData((prev) => ({
      ...prev,
      slug: slugify(val),
    }));
  };

  const handleOpenAddField = () => {
    setEditingFieldIndex(null);
    setTempField({
      name: "",
      label: "",
      type: "text",
      required: false,
      placeholder: "",
      options: [],
    });
    setRawOptions("");
    setFieldModalOpen(true);
  };

  const handleOpenEditField = (index: number) => {
    const f = inputData.fields[index];
    if (!f) return;
    setEditingFieldIndex(index);
    setTempField({ ...f });
    setRawOptions(Array.isArray(f.options) ? f.options.join("\n") : "");
    setFieldModalOpen(true);
  };

  const handleSaveFieldModal = () => {
    if (!tempField.label.trim()) {
      toast.error("Field label is required");
      return;
    }
    const safeName = tempField.name.trim() || toSnakeCase(tempField.label) || "field_" + Date.now();

    const optionsList =
      tempField.type === "select"
        ? rawOptions
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const newField: FormField = {
      name: safeName,
      label: tempField.label.trim(),
      type: tempField.type,
      required: tempField.required,
      placeholder: tempField.placeholder?.trim() || undefined,
      options: optionsList,
    };

    setInputData((prev) => {
      if (editingFieldIndex !== null) {
        const next = [...prev.fields];
        next[editingFieldIndex] = newField;
        return { ...prev, fields: next };
      }
      return { ...prev, fields: [...prev.fields, newField] };
    });

    setFieldModalOpen(false);
  };

  const handleRemoveField = (index: number) => {
    setInputData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const handleMoveField = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= inputData.fields.length) return;
    const item = inputData.fields[index];
    const targetItem = inputData.fields[targetIndex];
    if (!item || !targetItem) return;
    setInputData((prev) => {
      const next = [...prev.fields];
      next[index] = targetItem;
      next[targetIndex] = item;
      return { ...prev, fields: next };
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputData.title.trim()) {
      toast.error("Form title is required");
      return;
    }
    if (inputData.fields.length === 0) {
      toast.error("Form must contain at least one input field");
      return;
    }

    await onSave({
      title: inputData.title.trim(),
      slug: inputData.slug.trim() || slugify(inputData.title),
      description: inputData.description.trim() || undefined,
      fields: inputData.fields,
      captchaProvider: inputData.captchaProvider,
      challengeType: inputData.challengeType,
      submitButtonText: inputData.submitButtonText.trim() || "Submit",
      successMessage: inputData.successMessage.trim() || "Thank you for your submission.",
    });
  };

  useSaveShortcut(() => handleSubmit());

  return {
    inputData,
    setInputData,
    handleTitleChange,
    handleSlugChange,
    handleOpenAddField,
    handleOpenEditField,
    handleSaveFieldModal,
    handleRemoveField,
    handleMoveField,
    handleSubmit,
    fieldModalOpen,
    setFieldModalOpen,
    editingFieldIndex,
    tempField,
    setTempField,
    rawOptions,
    setRawOptions,
  };
}
