"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ComponentType<{ className?: string }>;
}

export const Input: React.FC<InputProps> = ({
  className = "",
  label,
  error,
  helperText,
  leftIcon: LeftIcon,
  id,
  type = "text",
  ...props
}) => {
  const inputId = id || React.useId();

  return (
    <div className="w-full space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold tracking-wider text-zinc-400"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
            <LeftIcon className="h-4 w-4" />
          </span>
        )}
        <input
          id={inputId}
          type={type}
          className={`w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
            LeftIcon ? "pl-10" : ""
          } ${error ? "border-red-500/50 focus:border-red-500" : ""} ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs text-red-400 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-zinc-500">{helperText}</p>
      ) : null}
    </div>
  );
};
