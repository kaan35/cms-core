import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { database } from "@cms/db";
import { config } from "./ConfigService.ts";
import { logger } from "./LogService.ts";

export class BackupService {
  private static s3Client = new S3Client({
    endpoint: config.S3_ENDPOINT,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY,
      secretAccessKey: config.S3_SECRET_KEY,
    },
    region: config.S3_REGION,
    forcePathStyle: true, // Necessary for local MinIO setup
  });

  static init() {
    logger.info("📦 BackupService: Initializing daily backup scheduler...");

    // Daily backup every 24 hours
    setInterval(() => {
      this.runBackup().catch((err) => {
        logger.error(err, "💥 BackupService: Scheduled backup failed");
      });
    }, 24 * 60 * 60 * 1000);

    logger.info("📦 BackupService: Daily backup scheduled (runs every 24 hours)");
  }

  static async runBackup(): Promise<string> {
    logger.info("📦 BackupService: Starting database dump...");
    const db = database.getDb();
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

    await this.ensureBucketExists(config.S3_BUCKET);

    logger.info(
      `📦 BackupService: Uploading backup to S3 [${config.S3_BUCKET}/${backupFileName}]...`
    );
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: backupFileName,
        Body: backupContent,
        ContentType: "application/json",
      })
    );

    logger.info(`📦 BackupService: Backup completed! File: ${backupFileName}`);
    return backupFileName;
  }

  private static async ensureBucketExists(bucketName: string) {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    } catch (err: any) {
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        logger.info(`📦 BackupService: Creating bucket '${bucketName}'...`);
        try {
          await this.s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        } catch (createErr: any) {
          logger.error(createErr, `💥 BackupService failed to create bucket '${bucketName}'`);
          throw createErr;
        }
      } else {
        logger.error(err, `💥 BackupService: Error verifying bucket '${bucketName}'`);
        throw err;
      }
    }
  }
}
