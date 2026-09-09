interface ImportMetaEnv {
    readonly VITE_APPWRITE_ENDPOINT: string;
    readonly VITE_APPWRITE_PROJECT_ID: string;
    readonly VITE_APPWRITE_BLOG_DATABASE_ID: string;
    readonly VITE_APPWRITE_POSTS_TABLE_ID: string;
    readonly VITE_APPWRITE_BLOG_BUCKET_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}