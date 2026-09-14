import { Client, ID, Query, TablesDB } from "appwrite";

import config from "./config";

type PostStatus = "draft" | "published" | "archived";

interface CreatePostData {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImageId?: string;
  status: PostStatus;
  authorId: string;
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

  private normalizedTags(tags?: string[]) {
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

  async createPost(post: CreatePostData) {
    const title = post.title.trim();
    const slug = post.title.trim().toLowerCase();
    const content = post.content.trim();
    const tags = this.normalizedTags(post.tags);

    if (!title || !slug || !content) {
      throw new Error("Title, slug, and content are required.");
    }

    const publishedAt =
      post.status === "published"
        ? (post.publishedAt ?? new Date().toISOString())
        : null;

    return this.tablesDB.createRow({
      databaseId: config.blogDatabaseId,
      tableId: config.postsTableId,
      rowId: ID.unique(),
      data: {
        ...post,
        title,
        slug,
        content,
        tags,
        publishedAt,
      },
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
    const normalizedSlug = slug.trim().toLowerCase();

    if (!normalizedSlug) {
      throw new Error("Post slug is required.");
    }

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
}

const postsService = new PostsService();

export default postsService;
