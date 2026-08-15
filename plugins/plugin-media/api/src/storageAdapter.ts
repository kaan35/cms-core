import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export interface StorageUploadResult {
  key: string;
  url: string;
  size: number;
}

export interface IStorageAdapter {
  upload(key: string, body: Buffer | Uint8Array, mimeType: string): Promise<StorageUploadResult>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

export interface S3StorageConfig {
  bucket: string;
  endpoint: string;
  region?: string | undefined;
  accessKeyId?: string | undefined;
  secretAccessKey?: string | undefined;
  forcePathStyle?: boolean | undefined;
  publicUrl?: string | undefined;
}

export class S3StorageAdapter implements IStorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly region: string;
  private readonly publicUrl: string | undefined;

  constructor(config: S3StorageConfig, s3Client?: S3Client) {
    this.bucket = config.bucket;
    this.endpoint = config.endpoint;
    this.region = config.region ?? "us-east-1";
    this.publicUrl = config.publicUrl;

    if (s3Client) {
      this.client = s3Client;
    } else {
      const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
        region: this.region,
        forcePathStyle: config.forcePathStyle ?? true,
      };

      clientConfig.endpoint = config.endpoint;

      if (config.accessKeyId && config.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        };
      }

      this.client = new S3Client(clientConfig);
    }
  }

  async upload(
    key: string,
    body: Buffer | Uint8Array,
    mimeType: string,
  ): Promise<StorageUploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: mimeType,
    });

    await this.client.send(command);

    return {
      key,
      url: this.getUrl(key),
      size: body.length,
    };
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  getUrl(key: string): string {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, "")}/${key}`;
    }
    // MinIO path-style: http(s)://endpoint/bucket/key
    return `${this.endpoint.replace(/\/$/, "")}/${this.bucket}/${key}`;
  }
}
