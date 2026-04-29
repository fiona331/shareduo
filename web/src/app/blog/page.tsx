import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts, formatDate } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — ShareDuo",
  description:
    "Guides and tips for sharing Claude artifacts, HTML files, and prototypes with anyone — no account required.",
};

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-violet-50 to-indigo-100">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-3xl mx-auto">
        <Link href="/" className="font-semibold text-gray-900 tracking-tight hover:opacity-70 transition-opacity">
          ShareDuo
        </Link>
        <a
          href="https://github.com/fiona331/shareduo"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          GitHub
        </a>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pb-24 pt-8">

        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Blog</h1>
          <p className="text-sm text-gray-500 mt-1">
            Guides for sharing Claude artifacts and HTML with anyone.
          </p>
        </div>

        <div className="space-y-3">
          {getAllPosts().map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">
                    {post.description}
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 flex-shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-gray-400">{formatDate(post.date)}</span>
                <span className="text-gray-200">·</span>
                <span className="text-xs text-gray-400">{post.readingTime}</span>
              </div>
            </Link>
          ))}
        </div>

      </main>

      <footer className="text-center py-8">
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
