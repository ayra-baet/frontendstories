import { Client, TablesDB, Permission, Role, ID, Query } from "appwrite";

import config from "./config";
import authService from "./auth.service";

type PostStatus = "draft" | "published" | "archived";

interface CreatePostData {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImageId?: string;
  status: PostStatus;
  tags?: string[];
  publishedAt?: string | null;
}

class PostsService {
  private tablesDB: TablesDB;

  constructor() {
    const client = new Client()
      .setEndpoint(config.endpoint)
      .setProject(config.projectId);

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

  async deletePost(id: string) {
    if (!id) {
      throw new Error("Post ID is required.");
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
