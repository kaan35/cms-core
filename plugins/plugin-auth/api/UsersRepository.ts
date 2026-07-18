import type { IDatabase, ILogger } from "@cms/core";
import { parseObjectId } from "@cms/core";
import type { Collection, Document } from "mongodb";
import { COLLECTIONS } from "./constants.ts";

export interface User extends Document {
  _id?: string;
  email: string;
  passwordHash: string;
  role: string;
  permissions: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export class UsersRepository {
  private readonly db: IDatabase;
  private readonly logger: ILogger;
  private readonly usersCollection: Collection<User>;

  constructor(db: IDatabase, logger: ILogger) {
    this.db = db;
    this.logger = logger;
    this.usersCollection = this.db.getCollection<User>(COLLECTIONS.USERS);
  }

  async findById(id: string): Promise<User | null> {
    try {
      const objectId = parseObjectId(id);
      return await this.usersCollection.findOne({ _id: objectId } as any);
    } catch {
      return null;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersCollection.findOne({ email } as any);
  }

  async findAll(): Promise<User[]> {
    return this.usersCollection.find({}, { projection: { passwordHash: 0 } } as any).toArray();
  }

  async create(userData: Omit<User, "createdAt">): Promise<User> {
    const newUser: User = {
      ...userData,
      createdAt: new Date(),
    } as User;
    const result = await this.usersCollection.insertOne(newUser as any);
    return {
      ...newUser,
      _id: result.insertedId.toString(),
    };
  }

  async updatePermissions(id: string, permissions: string[]): Promise<boolean> {
    const objectId = parseObjectId(id);
    const result = await this.usersCollection.updateOne(
      { _id: objectId } as any,
      {
        $set: {
          permissions,
          updatedAt: new Date(),
        },
      } as any,
    );
    return result.modifiedCount > 0;
  }

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    const objectId = parseObjectId(id);
    const result = await this.usersCollection.updateOne(
      { _id: objectId } as any,
      {
        $set: {
          passwordHash,
          updatedAt: new Date(),
        },
      } as any,
    );
    return result.modifiedCount > 0;
  }

  async delete(id: string): Promise<boolean> {
    const objectId = parseObjectId(id);
    const result = await this.usersCollection.deleteOne({ _id: objectId } as any);
    return result.deletedCount > 0;
  }
}
