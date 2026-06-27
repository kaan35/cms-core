import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  title,
  description,
  headerAction,
  ...props
}) => {
  return (
    <div
      className={`p-6 rounded-xl border border-white/5 bg-zinc-900/40 backdrop-blur-md space-y-4 ${className}`}
      {...props}
    >
      {(title || description || headerAction) && (
        <div className="flex justify-between items-start gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1">
            {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
            {description && <p className="text-xs text-zinc-400">{description}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="pt-2">{children}</div>
    </div>
  );
};
