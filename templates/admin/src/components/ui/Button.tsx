import { Loader2 } from "lucide-react";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  isDisabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  variant = "primary",
  size = "md",
  isLoading = false,
  isDisabled = false,
  disabled = false,
  icon: Icon,
  type = "button",
  ...props
}) => {
  // Base classes
  const baseClass =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium cursor-pointer transition duration-150 select-none disabled:opacity-50 disabled:cursor-not-allowed";

  // Size variations
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
    icon: "p-2 text-sm",
  };

  // Variant styles
  const variants = {
    primary:
      "border border-blue-500/40 bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/10 transition",
    secondary:
      "border border-zinc-700/80 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white hover:border-zinc-600 transition shadow-sm",
    danger:
      "border border-red-500/30 bg-red-950/40 hover:bg-red-900/50 hover:border-red-500/50 text-red-200 hover:text-red-100 transition shadow-sm",
    ghost:
      "bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white border border-transparent transition",
  };

  const finalClass = `${baseClass} ${sizes[size]} ${variants[variant]} ${className}`;

  // Support both isDisabled and disabled props for backward compatibility
  const isButtonDisabled = isDisabled || disabled || isLoading;

  return (
    <button type={type} disabled={isButtonDisabled} className={finalClass} {...props}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : Icon ? (
        <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      ) : null}
      {children}
    </button>
  );
};
