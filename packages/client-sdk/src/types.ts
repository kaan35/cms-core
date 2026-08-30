export interface SettingsDoc {
  siteTitle?: string;
  siteDescription?: string;
  defaultTheme?: "dark" | "light" | "system";
  brandColor?: string;
  footerText?: string;
  headerMenu?: Array<{
    id: string;
    label: string;
    url: string;
    type: "page" | "custom" | "blog";
    pageId?: string;
    customLabel?: boolean;
    external?: boolean;
    style?: "link" | "button";
    badge?: string;
    icon?: string;
  }>;
  footerMenu?: Array<{
    id: string;
    label: string;
    url: string;
    type: "page" | "custom" | "blog";
    pageId?: string;
    customLabel?: boolean;
    external?: boolean;
  }>;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CaptchaChallenge {
  token: string;
  num1: number;
  num2: number;
  operation: string;
  prompt: string;
}
