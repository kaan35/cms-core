export interface SystemSettingsData {
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
  siteTitle: string;
  siteDescription: string;
  primaryColor: string;
  fontFamily: string;
  defaultTheme: string;
  footerText: string;
  allowRegistration: boolean;
  sessionTimeoutMinutes: number;
}
