const config = {
    endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT,
    projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
    blogDatabaseId: import.meta.env.VITE_APPWRITE_BLOG_DATABASE_ID,
    postsTableId: import.meta.env.VITE_APPWRITE_POSTS_TABLE_ID,
    blogBucketId: import.meta.env.VITE_APPWRITE_BLOG_BUCKET_ID
}

export default config;