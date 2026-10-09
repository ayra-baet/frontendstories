import type { CreatePostData, Post } from "../models/post";
import authService from "../services/auth.service";
import postsService from "../services/posts.service";
import storageService from "../services/storage.service";

async function createPostWithImage(
  postData: CreatePostData,
  coverImage?: File,
): Promise<Post> {
  const currentUser = await authService.getCurrentUser();

  let uploadedImageId: string | null = null;

  if (coverImage) {
    const file = await storageService.uploadImage(
      coverImage,
      currentUser.$id,
      postData.status,
    );

    uploadedImageId = file.$id;
  }

  try {
    const post = await postsService.createPost({
      ...postData,
      coverImageId: uploadedImageId ?? undefined,
    });

    return post;
  } catch (error) {
    // Compensate for a failed post creation to avoid leaving an orphaned image.
    if (uploadedImageId) {
      try {
        await storageService.deleteImage(uploadedImageId);
      } catch (cleanUpError) {
        // Clean up is the best-effort; preserve the original post creation error.
        console.error(
          "createPostWithImage :: failed to clean up uploaded image",
          cleanUpError,
        );
      }
    }

    // Preserve the original error so the caller can handle the post creation failure.
    throw error;
  }
}

export default createPostWithImage;
