import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import type { Post } from "../models/post";
import postsService from "../services/posts.service";
import getErrorMessage from "../utils/getErrorMessage";

function PostPage() {
  const { slug } = useParams();

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    let ignore = false;

    async function fetchPost(currentSlug: string) {
      setIsLoading(true);
      setError(null);

      try {
        const result = await postsService.getPostBySlug(currentSlug);

        if (!ignore) {
          setPost(result);
        }
      } catch (err) {
        if (!ignore) {
          setError(getErrorMessage(err));
          setPost(null);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchPost(slug);

    return () => {
      ignore = true;
    };
  }, [slug]);

  if (!slug) {
    return <p>Post slug is missing</p>;
  }

  if (isLoading) {
    return <p>Loading post...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!post) {
    return <p>Post not found.</p>;
  }

  return (
    <article>
      <h1>{post.title}</h1>

      {post.excerpt && <p>{post.excerpt}</p>}

      <div>
        <p>{post.content}</p>
      </div>
    </article>
  );
}

export default PostPage;
