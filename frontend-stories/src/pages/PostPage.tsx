import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useParams } from "react-router-dom";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

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
    <article className="pt-12 pb-16 wrap-break-word sm:pt-16 sm:pb-24">
      <div className="container-page">
        <div className="mx-auto max-w-3xl">
          <header>
            {post.tags.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <li
                    className="rounded-full bg-lilac/40 px-3 py-1 text-sm font-medium text-deepplum"
                    key={tag}
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}

            <h1 className="mt-5 text-4xl leading-[1.1] font-semibold text-balance sm:text-5xl lg:text-6xl">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-5 max-w-2xl font-serif text-xl leading-8 text-pretty text-muted-foreground sm:text-2xl sm:leading-9">
                {post.excerpt}
              </p>
            )}

            {post.publishedAt && (
              <time
                dateTime={post.publishedAt}
                className="mt-6 block text-sm text-muted-foreground"
              >
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            )}
          </header>

          <div className="mt-10 border-t border-border pt-10 sm:mt-14 sm:pt-14">
            <div className="prose prose-lg font-serif text-foreground sm:prose-xl prose-headings:font-semibold prose-a:text-deepplum prose-a:decoration-mauve/60 prose-a:decoration-1 prose-a:underline-offset-4 hover:prose-a:text-mauve hover:prose-a:decoration-mauve prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {post.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default PostPage;
