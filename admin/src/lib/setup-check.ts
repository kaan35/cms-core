import { apiServer } from "./server-api";

export interface SetupStatus {
  needsSetup: boolean;
  setupEnabled: boolean;
}

export async function getSetupStatusServer(): Promise<SetupStatus> {
  try {
    const res = await apiServer.get<SetupStatus>("/auth/setup");
    if (res) {
      return res;
    }
  } catch {
    // If backend is starting up or unreachable
  }
  return { needsSetup: false, setupEnabled: false };
}
