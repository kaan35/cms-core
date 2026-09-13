export interface SystemSettingsData {
  adminTitle?: string;
  siteTitle?: string;
  siteDescription?: string;
  primaryColor?: string;
  fontFamily?: string;
  defaultTheme?: string;
  footerText?: string;
  allowRegistration?: boolean;
  sessionTimeoutMinutes?: number;
}

export interface SettingsFormData {
  adminTitle: string;
  siteTitle: string;
  siteDescription: string;
  primaryColor: string;
  fontFamily: string;
  defaultTheme: string;
  footerText: string;
  allowRegistration: boolean;
  sessionTimeoutMinutes: number;
}
