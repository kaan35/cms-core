"use client";

import { cn } from "@cms/admin-shell";
import { FormConfigCard } from "./components/FormConfigCard";
import { FormFieldDialog } from "./components/FormFieldDialog";
import { FormFieldList } from "./components/FormFieldList";
import { FormSecurityCard } from "./components/FormSecurityCard";
import type { FormDoc } from "./components/useFormBuilder";
import { useFormBuilder } from "./components/useFormBuilder";

export type { FormDoc, FormField, FormFieldType } from "./components/useFormBuilder";

export interface FormBuilderProps {
  initialData?: Partial<FormDoc> | undefined;
  onSave: (data: Omit<FormDoc, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  className?: string | undefined;
}

export function FormBuilder({ initialData, onSave, className }: FormBuilderProps) {
  const {
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
  } = useFormBuilder(initialData, onSave);

  return (
    <form id="form-builder-form" onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Form Settings & Fields (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          <FormConfigCard
            data={inputData}
            onTitleChange={handleTitleChange}
            onSlugChange={handleSlugChange}
            onDescriptionChange={(val) => setInputData((prev) => ({ ...prev, description: val }))}
          />

          <FormFieldList
            fields={inputData.fields}
            onOpenAddField={handleOpenAddField}
            onOpenEditField={handleOpenEditField}
            onMoveField={handleMoveField}
            onRemoveField={handleRemoveField}
          />
        </div>

        {/* Right Column: Security, Captcha, Submissions & Save (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          <FormSecurityCard data={inputData} onDataChange={setInputData} />
        </div>
      </div>

      {/* Field Configuration Dialog */}
      <FormFieldDialog
        open={fieldModalOpen}
        onOpenChange={setFieldModalOpen}
        isEditing={editingFieldIndex !== null}
        field={tempField}
        onFieldChange={setTempField}
        rawOptions={rawOptions}
        onRawOptionsChange={setRawOptions}
        onSave={handleSaveFieldModal}
      />
    </form>
  );
}
