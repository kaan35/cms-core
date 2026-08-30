import type { LucideIcon } from "lucide-react";
import { File, FileCode, FileText, Film, Image as ImageIcon, Music } from "lucide-react";

export function getFileIcon(mimeType: string): LucideIcon {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text"))
    return FileText;
  if (mimeType.includes("json") || mimeType.includes("javascript")) return FileCode;
  return File;
}
