import { ID, Storage, type Models } from "appwrite";
import client from "./client";
import config from "../config/config";

class StorageService {
  private storage: Storage;

  constructor() {
    this.storage = new Storage(client);
  }

  async uploadImage(image: File, permissions?: string[]): Promise<Models.File> {
    if (!image) {
      throw new Error("Image is required.");
    }

    return this.storage.createFile({
      bucketId: config.blogBucketId,
      fileId: ID.unique(),
      file: image,
      permissions,
    });
  }

  async deleteImage(fileId: string): Promise<void> {
    if (!fileId) {
      throw new Error("File ID is required.");
    }

    await this.storage.deleteFile({
      bucketId: config.blogBucketId,
      fileId,
    });
  }

  getFileView(fileId: string): string {
    if (!fileId) {
      throw new Error("File ID is required.");
    }

    return this.storage
      .getFileView({
        bucketId: config.blogBucketId,
        fileId,
      })
      .toString();
  }

  getFilePreview(fileId: string, width?: number, height?: number): string {
    if (!fileId) {
      throw new Error("File ID is required.");
    }

    return this.storage
      .getFilePreview({
        bucketId: config.blogBucketId,
        fileId,
        width,
        height,
      })
      .toString();
  }
}

const storageService = new StorageService();

export default storageService;
