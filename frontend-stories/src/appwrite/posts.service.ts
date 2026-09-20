import { TablesDB, Permission, Role, ID, Query } from "appwrite";
import config from "../config/config";
import type {
  CreatePostData,
  PostStatus,
  UpdatePostData,
} from "../models/post";
import client from "./client";
import authService from "./auth.service";

class PostsService {
  private tablesDB: TablesDB;

  constructor() {
    this.tablesDB = new TablesDB(client);
  }

  private normalizeSlug(slug: string) {
    const normalizedSlug = slug.trim().toLowerCase();

    if (!normalizedSlug) {
      throw new Error("Post slug is required.");
    }

    return normalizedSlug;
  }

  private normalizeTags(tags?: string[]) {
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

  private getPostPermissions(userId: string, status: PostStatus) {
    const permissions = [
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

  async createPost(post: CreatePostData) {
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

    return this.tablesDB.createRow({
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
  }

  async getPostById(id: string) {
    if (!id) {
      throw new Error("Post ID is required.");
    }

    return this.tablesDB.getRow({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: id,
    });
  }

  async getPostBySlug(slug: string) {
    const normalizedSlug = this.normalizeSlug(slug);

    const result = await this.tablesDB.listRows({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      queries: [
        Query.equal("slug", normalizedSlug),
        Query.equal("status", "published"),
        Query.limit(1),
      ],
    });

    return result.rows[0] ?? null;
  }

  async getPublishedPosts(queries: string[] = []) {
    return this.tablesDB.listRows({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      queries: [
        Query.equal("status", "published"),
        Query.orderDesc("publishedAt"),
        ...queries,
      ],
    });
  }

  async getMyPosts(queries: string[] = []) {
    const currentUser = await authService.getCurrentUser();

    return this.tablesDB.listRows({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      queries: [
        Query.equal("authorId", currentUser.$id),
        Query.orderDesc("$createdAt"),
        ...queries,
      ],
    });
  }

  async updatePost(id: string, updates: UpdatePostData) {
    if (!id) {
      throw new Error("Post ID is required.");
    }

    const currentUser = await authService.getCurrentUser();

    const existingPost = await this.tablesDB.getRow({
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

    return this.tablesDB.updateRow({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: id,
      data: normalizedUpdates,
      permissions,
    });
  }

  async deletePost(id: string) {
    if (!id) {
      throw new Error("Post ID is required.");
    }

    const currentUser = await authService.getCurrentUser();

    const existingPost = await this.tablesDB.getRow({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: id,
    });

    if (existingPost.authorId !== currentUser.$id) {
      throw new Error("You are not allowed to delete the post.");
    }

    return this.tablesDB.deleteRow({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: id,
    });
  }
}

const postsService = new PostsService();

export default postsService;
