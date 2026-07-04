import type { IDatabase, ILogger } from "@cms/core";
import { parseObjectId } from "@cms/core";
import type { Collection, Document } from "mongodb";
import { COLLECTIONS } from "./constants.ts";

export interface Role extends Document {
  _id?: string;
  name: string;
  description?: string;
  permissions: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class RolesRepository {
  private readonly db: IDatabase;
  private readonly logger: ILogger;
  private readonly rolesCollection: Collection<Role>;

  constructor(db: IDatabase, logger: ILogger) {
    this.db = db;
    this.logger = logger;
    this.rolesCollection = this.db.getCollection<Role>(COLLECTIONS.ROLES);
  }

  async findAll(): Promise<Role[]> {
    return this.rolesCollection.find({}).sort({ name: 1 } as any).toArray();
  }

  async findByName(name: string): Promise<Role | null> {
    return this.rolesCollection.findOne({ name } as any);
  }

  async findById(id: string): Promise<Role | null> {
    try {
      const objectId = parseObjectId(id);
      return await this.rolesCollection.findOne({ _id: objectId } as any);
    } catch {
      return null;
    }
  }

  async create(roleData: Omit<Role, "createdAt" | "updatedAt">): Promise<Role> {
    const role: Role = {
      ...roleData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Role;
    const result = await this.rolesCollection.insertOne(role as any);
    return {
      ...role,
      _id: result.insertedId.toString(),
    };
  }

  async update(id: string, name: string, description: string | undefined, permissions: string[]): Promise<boolean> {
    const objectId = parseObjectId(id);
    const result = await this.rolesCollection.updateOne(
      { _id: objectId } as any,
      {
        $set: {
          name,
          description,
          permissions,
          updatedAt: new Date(),
        },
      } as any
    );
    return result.matchedCount > 0;
  }

  async delete(id: string): Promise<boolean> {
    const objectId = parseObjectId(id);
    const result = await this.rolesCollection.deleteOne({ _id: objectId } as any);
    return result.deletedCount > 0;
  }
}
