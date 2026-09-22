export type PostStatus = "draft" | "published" | "archived";

export interface Post {
    id: string;
    createdAt: string;
    updatedAt: string;

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

export interface CreatePostData {
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    coverImageId?: string;
    status: PostStatus;
    tags?: string[];
    publishedAt?: string | null;
}

export interface UpdatePostData {
    title?: string;
    slug?: string;
    excerpt?: string | null;
    content?: string;
    coverImageId?: string | null;
    status?: PostStatus;
    tags?: string[];
    publishedAt?: string | null;
}