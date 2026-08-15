export interface CaptchaVerifyResult {
  passed: boolean;
  onFailure: "silent-success" | "error";
  error?: string;
}

export interface ICaptchaProvider {
  readonly id: string;
  verify(
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<CaptchaVerifyResult>;
}
