import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import type { IDatabase } from "./types/IDatabase.ts";
import type { ILogger } from "./types/ILogger.ts";
import type { Config } from "./ConfigService.ts";

export class BackupService {
  private s3Client: S3Client;

  constructor(
    private readonly database: IDatabase,
    private readonly logger: ILogger,
    private readonly config: Config
  ) {
    this.s3Client = new S3Client({
      endpoint: config.S3_ENDPOINT,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY,
        secretAccessKey: config.S3_SECRET_KEY,
      },
      region: config.S3_REGION,
      forcePathStyle: true, // Necessary for local MinIO setup
    });
  }

  init() {
    this.logger.info("📦 BackupService: Initializing daily backup scheduler...");

    // Daily backup every 24 hours
    setInterval(() => {
      this.runBackup().catch((err) => {
        this.logger.error(err, "💥 BackupService: Scheduled backup failed");
      });
    }, 24 * 60 * 60 * 1000);

    this.logger.info("📦 BackupService: Daily backup scheduled (runs every 24 hours)");
  }

  async runBackup(): Promise<string> {
    this.logger.info("📦 BackupService: Starting database dump...");
    const db = this.database.getDb();
    if (!db) {
      throw new Error("Database not connected");
    }

    const collections = await db.listCollections().toArray();
    const backupData: Record<string, any[]> = {};

    for (const colInfo of collections) {
      const colName = colInfo.name;
      const docs = await db.collection(colName).find({}).toArray();
      backupData[colName] = docs;
    }

    const backupContent = JSON.stringify(backupData, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `backups/db-backup-${timestamp}.json`;

    await this.ensureBucketExists(this.config.S3_BUCKET);

    this.logger.info(
      `📦 BackupService: Uploading backup to S3 [${this.config.S3_BUCKET}/${backupFileName}]...`
    );
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.config.S3_BUCKET,
        Key: backupFileName,
        Body: backupContent,
        ContentType: "application/json",
      })
    );

    this.logger.info(`📦 BackupService: Backup completed! File: ${backupFileName}`);
    return backupFileName;
  }

  private async ensureBucketExists(bucketName: string) {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    } catch (err) {
      const awsErr = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (awsErr.name === "NotFound" || awsErr.$metadata?.httpStatusCode === 404) {
        this.logger.info(`📦 BackupService: Creating bucket '${bucketName}'...`);
        try {
          await this.s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        } catch (createErr) {
          this.logger.error(createErr, `💥 BackupService failed to create bucket '${bucketName}'`);
          throw createErr;
        }
      } else {
        this.logger.error(err, `💥 BackupService: Error verifying bucket '${bucketName}'`);
        throw err;
      }
    }
  }
}
