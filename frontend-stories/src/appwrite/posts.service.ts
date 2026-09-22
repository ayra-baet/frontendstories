import { TablesDB, Permission, Role, ID, Query, type Models } from "appwrite";

import config from "../config/config";

import type {
  CreatePostData,
  Post,
  PostStatus,
  UpdatePostData,
} from "../models/post";

import client from "./client";
import authService from "./auth.service";

interface AppwritePostRow extends Models.Row {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImageId: string | null;
  status: PostStatus;
  tags: string[];
  publishedAt: string | null;
  authorId: string;
}

class PostsService {
  private tablesDB: TablesDB;

  constructor() {
    this.tablesDB = new TablesDB(client);
  }

  private normalizeSlug(slug: string): string {
    const normalizedSlug = slug.trim().toLowerCase();

    if (!normalizedSlug) {
      throw new Error("Post slug is required.");
    }

    return normalizedSlug;
  }

  private normalizeTags(tags?: string[]): string[] {
    const normalizedTags = [
      ...new Set(
        (tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean),
      ),
    ];

    if (normalizedTags.length > 5) {
      throw new Error("A post can have at most 5 tags.");
    }

    return normalizedTags;
  }

  private getPostPermissions(userId: string, status: PostStatus): string[] {
    const permissions: string[] = [
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ];

    if (status === "published") {
      permissions.push(Permission.read(Role.any()));
    } else {
      permissions.push(Permission.read(Role.user(userId)));
    }

    return permissions;
  }

  private mapPost(row: AppwritePostRow): Post {
    return {
      id: row.$id,
      createdAt: row.$createdAt,
      updatedAt: row.$updatedAt,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      content: row.content,
      coverImageId: row.coverImageId,
      status: row.status,
      tags: row.tags,
      publishedAt: row.publishedAt,
      authorId: row.authorId,
    };
  }

  async createPost(post: CreatePostData): Promise<Post> {
    const title = post.title.trim();
    const slug = this.normalizeSlug(post.slug);
    const content = post.content.trim();
    const tags = this.normalizeTags(post.tags);

    if (!title || !content) {
      throw new Error("Title and content are required.");
    }

    const currentUser = await authService.getCurrentUser();

    const publishedAt =
      post.status === "published"
        ? (post.publishedAt ?? new Date().toISOString())
        : null;

    const permissions = this.getPostPermissions(currentUser.$id, post.status);

    const row = await this.tablesDB.createRow<AppwritePostRow>({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: ID.unique(),
      data: {
        title,
        slug,
        excerpt: post.excerpt?.trim() ?? null,
        content,
        coverImageId: post.coverImageId ?? null,
        status: post.status,
        tags,
        publishedAt,
        authorId: currentUser.$id,
      },
      permissions,
    });

    return this.mapPost(row);
  }

  async getPostById(id: string): Promise<Post> {
    if (!id) {
      throw new Error("Post ID is required.");
    }

    const row = await this.tablesDB.getRow<AppwritePostRow>({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: id,
    });

    return this.mapPost(row);
  }

  async getPostBySlug(slug: string): Promise<Post | null> {
    const normalizedSlug = this.normalizeSlug(slug);

    const result = await this.tablesDB.listRows<AppwritePostRow>({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      queries: [
        Query.equal("slug", normalizedSlug),
        Query.equal("status", "published"),
        Query.limit(1),
      ],
    });

    const row = result.rows[0];

    return row ? this.mapPost(row) : null;
  }

  async getPublishedPosts(queries: string[] = []): Promise<Post[]> {
    const result = await this.tablesDB.listRows<AppwritePostRow>({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      queries: [
        Query.equal("status", "published"),
        Query.orderDesc("publishedAt"),
        ...queries,
      ],
    });

    return result.rows.map((row) => this.mapPost(row));
  }

  async getMyPosts(queries: string[] = []): Promise<Post[]> {
    const currentUser = await authService.getCurrentUser();

    const result = await this.tablesDB.listRows<AppwritePostRow>({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      queries: [
        Query.equal("authorId", currentUser.$id),
        Query.orderDesc("$createdAt"),
        ...queries,
      ],
    });

    return result.rows.map((row) => this.mapPost(row));
  }

  async updatePost(id: string, updates: UpdatePostData): Promise<Post> {
    if (!id) {
      throw new Error("Post ID is required.");
    }

    const currentUser = await authService.getCurrentUser();

    const existingPost = await this.tablesDB.getRow<AppwritePostRow>({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: id,
    });

    if (existingPost.authorId !== currentUser.$id) {
      throw new Error("You are not allowed to update the post.");
    }

    const normalizedUpdates: UpdatePostData = {};

    if (updates.title !== undefined) {
      const title = updates.title.trim();

      if (!title) {
        throw new Error("Title cannot be empty.");
      }

      normalizedUpdates.title = title;
    }

    if (updates.slug !== undefined) {
      normalizedUpdates.slug = this.normalizeSlug(updates.slug);
    }

    if (updates.excerpt !== undefined) {
      normalizedUpdates.excerpt = updates.excerpt?.trim() || null;
    }

    if (updates.content !== undefined) {
      const content = updates.content.trim();

      if (!content) {
        throw new Error("Content cannot be empty.");
      }

      normalizedUpdates.content = content;
    }

    if (updates.coverImageId !== undefined) {
      normalizedUpdates.coverImageId = updates.coverImageId || null;
    }

    if (updates.tags !== undefined) {
      normalizedUpdates.tags = this.normalizeTags(updates.tags);
    }

    const nextStatus = updates.status ?? existingPost.status;

    normalizedUpdates.status = nextStatus;

    if (nextStatus === "published") {
      normalizedUpdates.publishedAt =
        existingPost.status === "published"
          ? existingPost.publishedAt
          : (updates.publishedAt ?? new Date().toISOString());
    } else {
      normalizedUpdates.publishedAt = null;
    }

    const permissions = this.getPostPermissions(currentUser.$id, nextStatus);

    const row = await this.tablesDB.updateRow<AppwritePostRow>({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: id,
      data: normalizedUpdates,
      permissions,
    });

    return this.mapPost(row);
  }

  async deletePost(id: string): Promise<void> {
    if (!id) {
      throw new Error("Post ID is required.");
    }

    const currentUser = await authService.getCurrentUser();

    const existingPost = await this.tablesDB.getRow<AppwritePostRow>({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: id,
    });

    if (existingPost.authorId !== currentUser.$id) {
      throw new Error("You are not allowed to delete the post.");
    }

    await this.tablesDB.deleteRow({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: id,
    });
  }
}

const postsService = new PostsService();

export default postsService;
