import type { HookManager, ILogger } from "@cms/core";
import { ConflictError, NotFoundError } from "@cms/core";
import { EVENTS } from "@cms/core";
import {
  type CreateFeatureFlagInput,
  type UpdateFeatureFlagInput,
  validateCreateFeatureFlag,
  validateUpdateFeatureFlag,
} from "../domain/system.rules.js";
import type {
  FeatureFlagDoc,
  FeatureFlagsRepository,
} from "../repositories/featureFlagsRepository.js";

export class FeatureFlagService {
  private readonly featureFlagsRepo: FeatureFlagsRepository;
  private readonly hooks: HookManager;
  private readonly logger: ILogger;

  constructor(featureFlagsRepo: FeatureFlagsRepository, hooks: HookManager, logger: ILogger) {
    this.featureFlagsRepo = featureFlagsRepo;
    this.hooks = hooks;
    this.logger = logger;
  }

  async listFeatureFlags(): Promise<FeatureFlagDoc[]> {
    return this.featureFlagsRepo.list();
  }

  async getFeatureFlag(key: string): Promise<FeatureFlagDoc> {
    const flag = await this.featureFlagsRepo.findByKey(key);
    if (!flag) {
      throw new NotFoundError(`Feature flag '${key}' not found`);
    }
    return flag;
  }

  async createFeatureFlag(
    input: unknown | CreateFeatureFlagInput,
    actorId?: string,
  ): Promise<FeatureFlagDoc> {
    const validated = validateCreateFeatureFlag(input);

    const existing = await this.featureFlagsRepo.findByKey(validated.key);
    if (existing) {
      throw new ConflictError(`Feature flag with key '${validated.key}' already exists`);
    }

    const created = await this.featureFlagsRepo.create({
      key: validated.key,
      label: validated.label || validated.key,
      ...(validated.description !== undefined ? { description: validated.description } : {}),
      value: validated.value ?? false,
    });

    await this.hooks.emit(EVENTS.SYSTEM.FEATURE_FLAG_CREATED, {
      key: created.key,
      value: created.value,
      actorId,
    });
    this.logger.info(`Feature flag '${created.key}' created`, {
      value: created.value,
      actorId,
    });

    return created;
  }

  async updateFeatureFlag(
    key: string,
    input: unknown | UpdateFeatureFlagInput,
    actorId?: string,
  ): Promise<FeatureFlagDoc> {
    const existing = await this.featureFlagsRepo.findByKey(key);
    if (!existing) {
      throw new NotFoundError(`Feature flag '${key}' not found`);
    }

    const validated = validateUpdateFeatureFlag(input);

    const patch: { label?: string; description?: string; value?: boolean } = {};
    if (validated.label !== undefined) patch.label = validated.label;
    if (validated.description !== undefined) patch.description = validated.description;
    if (validated.value !== undefined) patch.value = validated.value;

    const updated = await this.featureFlagsRepo.update(key, patch);

    if (!updated) {
      throw new NotFoundError(`Feature flag '${key}' not found`);
    }

    await this.hooks.emit(EVENTS.SYSTEM.FEATURE_FLAG_UPDATED, {
      key: updated.key,
      value: updated.value,
      actorId,
    });
    this.logger.info(`Feature flag '${updated.key}' updated`, {
      value: updated.value,
      actorId,
    });

    return updated;
  }

  async deleteFeatureFlag(key: string, actorId?: string): Promise<void> {
    const existing = await this.featureFlagsRepo.findByKey(key);
    if (!existing) {
      throw new NotFoundError(`Feature flag '${key}' not found`);
    }

    await this.featureFlagsRepo.delete(key);

    await this.hooks.emit(EVENTS.SYSTEM.FEATURE_FLAG_DELETED, { key, action: "deleted", actorId });
    this.logger.info(`Feature flag '${key}' deleted`, { actorId });
  }

  async evaluateFeatureFlag(key: string, defaultValue = false): Promise<boolean> {
    const flag = await this.featureFlagsRepo.findByKey(key);
    if (!flag) {
      return defaultValue;
    }
    return flag.value;
  }
}
