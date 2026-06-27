"use client";

import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  className = "",
  label,
  error,
  children,
  id,
  ...props
}) => {
  const selectId = id || React.useId();

  return (
    <div className="w-full space-y-2">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold tracking-wider text-zinc-400"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`block w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? "border-red-500/50 focus:border-red-500" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
    </div>
  );
};
