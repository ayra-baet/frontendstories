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
import storageService from "./storage.service";

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
    // Keep Appwrite's TablesDB details out of components.
    this.tablesDB = new TablesDB(client);
  }

  private normalizeSlug(slug: string): string {
    const normalizedSlug = slug.trim().toLowerCase();

    // Normalize the slug before persistence so the app stores one consistent value.
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

    // Normalize tags to one consistent format before persistence.
    // This service enforces the app's five-tag limit before saving the post.
    if (normalizedTags.length > 5) {
      throw new Error("A post can have at most 5 tags.");
    }

    return normalizedTags;
  }

  private getPostPermissions(userId: string, status: PostStatus): string[] {
    // Only the post owner should be able to modify or delete the post.
    //
    // These permissions are enforced by Appwrite itself, so the
    // application's authorization policy is also represented at the
    // persistence/infrastructure layer.
    const permissions: string[] = [
      Permission.update(Role.user(userId)),
      Permission.delete(Role.user(userId)),
    ];

    if (status === "published") {
      // Published posts are publicly readable.
      permissions.push(Permission.read(Role.any()));
    } else {
      // Draft posts remain private to their owner.
      permissions.push(Permission.read(Role.user(userId)));
    }

    // The post status therefore determines its read-access policy:
    //
    // draft -> owner only
    // published -> public
    //
    // Update/delete access remains restricted to the owner in both cases.
    return permissions;
  }

  private mapPost(row: AppwritePostRow): Post {
    // Appwrite returns its own representation, including fields such as
    // $id, $createdAt, and $updatedAt.
    //
    // Convert that infrastructure-specific representation into the
    // application's Post model before returning it to the rest of the app.
    //
    // This keeps Appwrite-specific details behind the service boundary.
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
    // Normalize user-provided values before persistence so that posts
    // are stored using consistent representations.
    const title = post.title.trim();
    const slug = this.normalizeSlug(post.slug);
    const content = post.content.trim();
    const tags = this.normalizeTags(post.tags);

    // Perform basic application-level validation before making the
    // external persistence request.
    if (!title || !content) {
      throw new Error("Title and content are required.");
    }

    // The authenticated user is the post author; the client does not choose that value.
    const currentUser = await authService.getCurrentUser();

    // Maintain the relationship between post status and publication time:
    //
    // draft -> publishedAt is null
    // published -> publishedAt contains the publication timestamp
    //
    // If the caller does not provide a publication time, the service
    // creates one when the post is first published.
    const publishedAt =
      post.status === "published"
        ? (post.publishedAt ?? new Date().toISOString())
        : null;

    // Translate the app's visibility rules into Appwrite permissions.
    const permissions = this.getPostPermissions(currentUser.$id, post.status);

    const row = await this.tablesDB.createRow<AppwritePostRow>({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,

      // The application generates the row ID rather than depending on
      // the user or UI to provide a database identifier.
      rowId: ID.unique(),
      data: {
        title,
        slug,
        excerpt: post.excerpt?.trim() || null,
        content,
        coverImageId: post.coverImageId ?? null,
        status: post.status,
        tags,
        publishedAt,

        // The authenticated user becomes the authoritative author.
        authorId: currentUser.$id,
      },
      permissions,
    });

    // Do not expose the Appwrite row directly to the rest of the app.
    // Convert it back into the application's Post model.
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

    // Appwrite is responsible for enforcing whether the current user
    // is allowed to read this row according to its permissions.
    //
    // The service then exposes the result using the application's
    // Post model rather than Appwrite's row representation.
    return this.mapPost(row);
  }

  async getPostBySlug(slug: string): Promise<Post | null> {
    const normalizedSlug = this.normalizeSlug(slug);

    const result = await this.tablesDB.listRows<AppwritePostRow>({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      queries: [
        Query.equal("slug", normalizedSlug),

        // This method represents the public "view post by slug" operation,
        // so only published posts are considered.
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
        // This method explicitly represents the public published-post feed.
        Query.equal("status", "published"),

        // Show the newest published posts first.
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
        // Scope the query to the authenticated user's posts, not the UI input.
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

    // Authentication tells us who is attempting the operation.
    const currentUser = await authService.getCurrentUser();

    // Retrieve the existing post before updating it because we need
    // information from the current state to:
    //
    // 1. verify ownership,
    // 2. determine the next status,
    // 3. preserve or create publishedAt,
    // 4. handle the existing cover image.
    const existingPost = await this.tablesDB.getRow<AppwritePostRow>({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: id,
    });

    // Authentication alone does not mean the user is authorized to
    // modify this particular post.
    //
    // The user must own the post.
    if (existingPost.authorId !== currentUser.$id) {
      throw new Error("You are not allowed to update the post.");
    }

    // Normalize and validate supplied fields before sending the update to Appwrite.
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
      normalizedUpdates.coverImageId = updates.coverImageId ?? null;
    }

    if (updates.tags !== undefined) {
      normalizedUpdates.tags = this.normalizeTags(updates.tags);
    }

    // If status wasn't supplied, preserve the existing status.
    const nextStatus = updates.status ?? existingPost.status;

    const statusChanged = nextStatus !== existingPost.status;

    normalizedUpdates.status = nextStatus;

    // Keep publication state consistent with post status.
    //
    // Publishing a draft sets publishedAt;
    // editing an already published post preserves it.
    //
    // Returning a post to draft clears it.
    if (nextStatus === "published") {
      normalizedUpdates.publishedAt =
        existingPost.status === "published"
          ? existingPost.publishedAt
          : (updates.publishedAt ?? new Date().toISOString());
    } else {
      normalizedUpdates.publishedAt = null;
    }

    // Set permissions from the next status so visibility matches draft/public state.
    const permissions = this.getPostPermissions(currentUser.$id, nextStatus);

    const row = await this.tablesDB.updateRow<AppwritePostRow>({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: id,
      data: normalizedUpdates,
      permissions,
    });

    // The post and its cover image are separate persisted resources.
    //
    // If publication status changes, the image's visibility must remain
    // consistent with the post's visibility.
    //
    // Image permission synchronization is handled separately because
    // StorageService owns image operations.
    if (statusChanged && existingPost.coverImageId) {
      try {
        await storageService.updateImagePermissions(
          existingPost.coverImageId,
          currentUser.$id,
          nextStatus,
        );
      } catch (error) {
        // The post update has already succeeded.
        //
        // Image permission synchronization is a separate operation, so
        // failure is logged rather than pretending the post update failed.
        console.error(
          "PostsService :: updatePost :: failed to update the cover image's permissions",
          error,
        );
      }
    }

    // If the post receives a different cover image, the previous image
    // is no longer referenced by the post and can be cleaned up.
    //
    // StorageService remains responsible for actually deleting the file.
    if (
      updates.coverImageId !== undefined &&
      existingPost.coverImageId !== null &&
      existingPost.coverImageId !== normalizedUpdates.coverImageId
    ) {
      try {
        await storageService.deleteImage(existingPost.coverImageId);
      } catch (error) {
        // Image cleanup failure should not make us report the already
        // successful post update as failed.
        console.error(
          "PostsService :: updatePost :: failed to delete cover image",
          error,
        );
      }
    }

    return this.mapPost(row);
  }

  async deletePost(id: string): Promise<void> {
    if (!id) {
      throw new Error("Post ID is required.");
    }

    const currentUser = await authService.getCurrentUser();

    // Retrieve the post first because we need its authorId for the
    // ownership check and its coverImageId for cleanup afterward.
    const existingPost = await this.tablesDB.getRow<AppwritePostRow>({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: id,
    });

    // Being authenticated does not automatically authorize the user
    // to delete this resource.
    //
    // Only the post owner is allowed to perform this operation.
    if (existingPost.authorId !== currentUser.$id) {
      throw new Error("You are not allowed to delete the post.");
    }

    // Delete the post from the database first.
    await this.tablesDB.deleteRow({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: id,
    });

    // The post and its cover image are stored as separate resources.
    // Once the post has been successfully deleted, clean up its image.
    if (existingPost.coverImageId) {
      try {
        await storageService.deleteImage(existingPost.coverImageId);
      } catch (error) {
        // Post deletion has already succeeded.
        //
        // Treat image cleanup as a separate best-effort operation and
        // log the failure so an orphaned image can be investigated.
        console.error(
          "PostsService :: deletePost :: failed to delete cover image",
          error,
        );
      }
    }
  }
}

const postsService = new PostsService();

export default postsService;
