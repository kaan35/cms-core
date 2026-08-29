export interface SetupStatus {
  needsSetup: boolean;
  setupEnabled: boolean;
}

export async function getSetupStatusServer(): Promise<SetupStatus> {
  try {
    const apiUrl = process.env.API_URL || "http://localhost:3001";
    const res = await fetch(`${apiUrl}/auth/setup`, {
      cache: "no-store",
    });
    if (res.ok) {
      return (await res.json()) as SetupStatus;
    }
  } catch {
    // If backend is starting up or unreachable
  }
  return { needsSetup: false, setupEnabled: false };
}
