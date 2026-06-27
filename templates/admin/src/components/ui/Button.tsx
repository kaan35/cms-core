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
      "border border-blue-500/20 bg-blue-600/20 hover:bg-blue-600/50 text-white shadow-lg shadow-blue-600/10",
    secondary:
      "border border-white/10 bg-transparent hover:bg-white/5 text-zinc-300 hover:text-white",
    danger:
      "border border-white/10 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/20 text-zinc-400 hover:text-red-400",
    ghost:
      "bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white border border-transparent",
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
