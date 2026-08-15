import type { CaptchaVerifyResult, ICaptchaProvider } from "./captchaProvider.js";
import { ChallengeCaptchaProvider } from "./challengeProvider.js";

class NoneCaptchaProvider implements ICaptchaProvider {
  readonly id = "none";

  async verify(_data: Record<string, unknown>): Promise<CaptchaVerifyResult> {
    return { passed: true, onFailure: "error" };
  }
}

export class CaptchaRegistry {
  private providers: Map<string, ICaptchaProvider> = new Map();

  constructor(secret?: string, maxAgeMs?: number) {
    this.register(new NoneCaptchaProvider());
    this.register(new ChallengeCaptchaProvider(secret, maxAgeMs));
  }

  register(provider: ICaptchaProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): ICaptchaProvider | undefined {
    return this.providers.get(id);
  }

  getRequired(id: string): ICaptchaProvider {
    const provider = this.get(id);
    if (!provider) {
      throw new Error(`Captcha provider '${id}' is not registered`);
    }
    return provider;
  }
}
