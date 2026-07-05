// API URL resolution helpers for Next.js (supports both Docker network and local development)

export const getInternalApiUrl = (): string => {
  return process.env.INTERNAL_API_URL || "http://localhost:3001";
};

export const getClientApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
};

export const getPublicSiteUrl = (): string => {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3003";
};
