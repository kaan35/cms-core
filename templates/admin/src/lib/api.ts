const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_URL}${path}`;

  const headers = { ...options.headers } as Record<string, string>;
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  // Set default credentials to include cookies
  const defaultOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers,
  };

  const response = await fetch(url, defaultOptions);

  if (response.status === 401 && !path.includes("/auth/login")) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(
      data.message || "Something went wrong",
      response.status,
      data
    );
  }

  return data;
}
