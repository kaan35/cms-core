import { ObjectId } from "mongodb";

/**
 * Safely parse a string into a MongoDB ObjectId, throwing a descriptive error if invalid.
 */
export function parseObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw new Error("Invalid ID format");
  }
}

/**
 * Serialize a MongoDB document by converting its ObjectId (_id) to a string.
 */
export function serializeDocument<T extends { _id?: ObjectId | string | unknown }>(doc: T): Omit<T, "_id"> & { _id: string } {
  if (!doc) return doc as Omit<T, "_id"> & { _id: string };
  return {
    ...doc,
    _id: doc._id ? String(doc._id) : "",
  };
}

/**
 * Serialize an array of MongoDB documents.
 */
export function serializeDocuments<T extends { _id?: ObjectId | string | unknown }>(docs: T[]): (Omit<T, "_id"> & { _id: string })[] {
  return docs.map(serializeDocument);
}
