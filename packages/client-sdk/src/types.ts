// --- Core Types ---
export type { PaginatedResult } from "@cms/core";

// --- Page & Block Types ---
export type {
  BentoGridBlock,
  BlogPostsBlock,
  CodeShowcaseBlock,
  CreatePageInput,
  FormBlock,
  GalleryBlock,
  HeroBlock,
  InteractiveDemoBlock,
  PageBlock,
  PageDoc,
  PageStatus,
  PageType,
  PageVersionDoc,
  TextBlock,
  UpdatePageInput,
} from "@cms/plugin-pages-api";
export type ContentBlock = import("@cms/plugin-pages-api").PageBlock;

// --- Blog Types ---
export type {
  BlogPostDoc,
  BlogPostStatus,
  BlogPostVersionDoc,
  CreateBlogPostInput,
  UpdateBlogPostInput,
} from "@cms/plugin-blog-api";

// --- Forms Types ---
export type {
  CaptchaProviderType,
  CaptchaVerifyResult,
  ChallengeData,
  ChallengeType,
  CreateFormInput,
  FormDoc,
  FormField,
  FormFieldType,
  FormSubmissionDoc,
  ICaptchaProvider,
  UpdateFormInput,
} from "@cms/plugin-forms-api";
export type FormFieldSchema = import("@cms/plugin-forms-api").FormField;
export type FormSubmission = import("@cms/plugin-forms-api").FormSubmissionDoc;

// --- Media Types ---
export type {
  AllowedMediaMimeType,
  IStorageAdapter,
  MediaDoc,
  MediaFolderDoc,
  S3StorageConfig,
  StorageUploadResult,
  UpdateMediaInput,
} from "@cms/plugin-media-api";

// --- Auth Types ---
export type {
  AuthResult,
  CreateRoleInput,
  CreateUserInput,
  ISessionInfo,
  LoginInput,
  RegisterInput,
  RoleDoc,
  SessionDoc,
  SetupInput,
  UpdateAuthSettingsInput,
  UpdateRoleInput,
  UpdateUserInput,
  UserDoc,
} from "@cms/plugin-auth-api";

// --- System & Navigation Types ---
export type {
  AuditLogDoc,
  CreateFeatureFlagInput,
  FeatureFlagDoc,
  NavigationMenuItem,
  PluginDoc,
  SettingsDoc,
  SiteTheme,
  SystemSettingsDoc,
  TogglePluginInput,
  UpdateFeatureFlagInput,
  UpdateSettingsInput,
} from "@cms/plugin-system-api";

// --- Client-Specific HTTP & Network Helper Types ---
export type { ApiRequestOptions, ClientConfig, QueryParamValue } from "./api.js";
