import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Compass,
  Flame,
  Globe,
  Home,
  Mail,
  Shield,
  Sparkles,
  Star,
  User,
} from "lucide-react";

export interface AvailableIcon {
  id: string;
  label: string;
  icon: LucideIcon | null;
}

export const AVAILABLE_ICONS: AvailableIcon[] = [
  { id: "none", label: "No Icon", icon: null },
  { id: "Home", label: "Home", icon: Home },
  { id: "BookOpen", label: "Blog / Book", icon: BookOpen },
  { id: "Mail", label: "Contact / Mail", icon: Mail },
  { id: "Sparkles", label: "Sparkles", icon: Sparkles },
  { id: "Star", label: "Star", icon: Star },
  { id: "Flame", label: "Flame / Hot", icon: Flame },
  { id: "Compass", label: "Compass", icon: Compass },
  { id: "Shield", label: "Shield", icon: Shield },
  { id: "User", label: "User", icon: User },
  { id: "Globe", label: "Globe", icon: Globe },
];

export function getIconComponent(iconName?: string): LucideIcon | null {
  if (!iconName || iconName === "none") return null;
  const match = AVAILABLE_ICONS.find((i) => i.id === iconName);
  return match ? match.icon : null;
}
