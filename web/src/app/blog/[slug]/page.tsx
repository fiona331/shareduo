import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { posts, getPost, formatDate } from "@/lib/blog";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} — ShareDuo`,
    description: post.description,
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto border-b border-gray-100">
        <Link href="/" className="font-semibold text-gray-900 tracking-tight hover:opacity-70 transition-opacity">
          ShareDuo
        </Link>
        <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← All posts
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 leading-tight tracking-tight">
            {post.title}
          </h1>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-gray-400">{formatDate(post.date)}</span>
            <span className="text-gray-200">·</span>
            <span className="text-xs text-gray-400">{post.readingTime}</span>
          </div>
        </div>

        {/* Content */}
        <div
          className="prose prose-sm prose-gray max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-br from-violet-50 to-indigo-100 rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold text-gray-900 mb-1">
            Ready to share your Claude artifact?
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Free, no signup. Anyone can view the link — no Claude account needed.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-gray-900 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Upload & share →
          </Link>
        </div>

      </main>

      <footer className="text-center py-8 border-t border-gray-100">
        <p className="text-xs text-gray-300">
          Made with ♥ in San Francisco ·{" "}
          <a href="mailto:fiona@tf9ventures.com" className="hover:text-gray-400 transition-colors">
            fiona@tf9ventures.com
          </a>
        </p>
      </footer>

    </div>
  );
}
