"use client";

import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  className = "",
  label,
  error,
  id,
  rows = 4,
  ...props
}) => {
  const generatedId = React.useId();
  const textareaId = id || generatedId;

  return (
    <div className="w-full space-y-2">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-semibold tracking-wider text-zinc-400"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? "border-red-500/50 focus:border-red-500" : ""
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
    </div>
  );
};
