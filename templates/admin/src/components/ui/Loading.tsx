import { Loader2 } from "lucide-react";

interface LoadingProps {
  /**
   * Size variant of the loading spinner
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
  /**
   * Optional text to display below spinner
   */
  text?: string;
  /**
   * Whether to show full-screen centered loading
   * @default false
   */
  isFullScreen?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function Loading({ size = "md", text, isFullScreen = false }: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500`} />
      {text && <p className="text-sm text-zinc-400">{text}</p>}
    </div>
  );

  if (isFullScreen) {
    return <div className="flex h-64 items-center justify-center">{content}</div>;
  }

  return content;
}
