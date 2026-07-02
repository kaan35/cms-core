import { z } from "zod";

const configSchema = z.object({
  API_PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGO_URI: z.string().default("mongodb://localhost:27017"),
  MONGO_DB_NAME: z.string().default("cms_dev"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  LOG_LEVEL: z.string().default("info"),
  JWT_SECRET: z.string().default("supersecretchangeit"),
  // S3 / MinIO Settings for backup & media
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_ACCESS_KEY: z.string().default("minioadmin"),
  S3_SECRET_KEY: z.string().default("minioadmin"),
  S3_BUCKET: z.string().default("cms-backups"),
  S3_REGION: z.string().default("us-east-1"),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Environment configuration errors:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof configSchema>;
