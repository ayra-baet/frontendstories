import { ID, Permission, Role, Storage, type Models } from "appwrite";
import client from "./client";
import config from "../config/config";
import type { PostStatus } from "../models/post";

class StorageService {
  private storage: Storage;

  constructor() {
    this.storage = new Storage(client);
  }

  private getImagePermissions(userId: string, status: PostStatus): string[] {
    return [
      status === "published"
        ? Permission.read(Role.any())
        : Permission.read(Role.user(userId)),
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ];
  }

  async uploadImage(
    image: File,
    userId: string,
    status: PostStatus,
  ): Promise<Models.File> {
    if (!(image instanceof File)) {
      throw new Error("Image is required.");
    }

    if (!userId) {
      throw new Error("User ID is required.");
    }

    return this.storage.createFile({
      bucketId: config.blogBucketId,
      fileId: ID.unique(),
      file: image,
      permissions: this.getImagePermissions(userId, status),
    });
  }

  async updateImagePermissions(
    fileId: string,
    userId: string,
    status: PostStatus,
  ): Promise<Models.File> {
    if (!fileId) {
      throw new Error("File ID is required.");
    }

    if (!userId) {
      throw new Error("User ID is required.");
    }

    return this.storage.updateFile({
      bucketId: config.blogBucketId,
      fileId,
      permissions: this.getImagePermissions(userId, status),
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