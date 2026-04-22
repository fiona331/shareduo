import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { shares } from "@/lib/db/schema";
import { relativeTime, absoluteTime } from "@/lib/relative-time";
import { DeleteButton } from "./DeleteButton";
import { CopyButton } from "./CopyButton";

// Noindex the manage page — URL contains the secret token as ?token=…
// and must never end up in search indexes, archive.org, etc.
export const metadata = {
  title: "Manage artifact — ShareDuo",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    nocache: true,
  },
  // No Open Graph — prevent link-unfurlers from caching preview snippets
  // with the token in them.
  openGraph: {},
  referrer: "no-referrer",
};

// Also prevent route-level caching
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams: Promise<{ token?: string }> | { token?: string };
};

export default async function ManagePage(props: PageProps) {
  const { slug } = await props.params;
  const { token } = await props.searchParams;

  if (!token) return renderUnauthorized();

  // Fetch share row
  let share: typeof shares.$inferSelect | undefined;
  try {
    const rows = await db
      .select()
      .from(shares)
      .where(eq(shares.slug, slug))
      .limit(1);
    share = rows[0];
  } catch {
    return renderError("Could not load artifact right now. Please try again.");
  }

  if (!share) return renderUnauthorized();

  // Verify token. Always bcrypt.compare even for non-existent shares — but
  // we short-circuited above; this is the real check.
  const valid = await bcrypt.compare(token, share.secret_token);
  if (!valid) return renderUnauthorized();

  // Build preview URL
  const previewBase = process.env.PREVIEW_BASE_URL ?? "";
  const previewUrl = `${previewBase}/${slug}`;

  // Compute state
  const isDeleted     = share.deleted_at !== null;
  const isAbuseFlag   = share.abuse_flagged_at !== null;
  const isExpired     = share.expires_at.getTime() < Date.now();
  const hasPassword   = share.password_hash !== null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-4">

        <div className="text-center pb-2">
          <h1 className="text-xl font-semibold text-gray-900">Manage artifact</h1>
          <p className="text-sm text-gray-500 mt-1">
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{slug}</code>
          </p>
        </div>

        {/* State banners */}
        {isDeleted && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <p className="font-medium text-gray-900">Deleted</p>
            <p className="text-xs text-gray-500 mt-0.5">
              This artifact was deleted {relativeTime(share.deleted_at)}. Content is gone;
              stats are preserved below.
            </p>
          </div>
        )}

        {!isDeleted && isAbuseFlag && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
            <p className="font-medium text-red-900">Flagged for abuse</p>
            <p className="text-xs text-red-700 mt-0.5">
              Flagged {relativeTime(share.abuse_flagged_at)}. The preview now shows a
              removal notice to viewers. If you believe this is a mistake, contact{" "}
              <a href="mailto:hello@shareduo.com" className="underline">hello@shareduo.com</a>.
            </p>
          </div>
        )}

        {!isDeleted && !isAbuseFlag && isExpired && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <p className="font-medium text-amber-900">Expired</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Expired {relativeTime(share.expires_at)}. Will be pruned automatically.
            </p>
          </div>
        )}

        {/* Stats card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stats</p>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-gray-900 tabular-nums">
                {share.view_count}
              </span>
              <span className="text-sm text-gray-500">
                {share.view_count === 1 ? "view" : "views"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {share.last_viewed_at
                ? <>Last viewed <span title={absoluteTime(share.last_viewed_at)}>{relativeTime(share.last_viewed_at)}</span></>
                : "No views yet"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-gray-100">
            <div>
              <p className="text-gray-400 uppercase tracking-wide text-[10px]">Created</p>
              <p className="text-gray-700 mt-0.5" title={absoluteTime(share.created_at)}>
                {relativeTime(share.created_at)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide text-[10px]">
                {isExpired ? "Expired" : "Expires"}
              </p>
              <p className="text-gray-700 mt-0.5" title={absoluteTime(share.expires_at)}>
                {relativeTime(share.expires_at)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide text-[10px]">Password</p>
              <p className="text-gray-700 mt-0.5">{hasPassword ? "Protected" : "None"}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide text-[10px]">Status</p>
              <p className="text-gray-700 mt-0.5">
                {isDeleted     ? "Deleted"
                : isAbuseFlag  ? "Flagged"
                : isExpired    ? "Expired"
                :                "Live"}
              </p>
            </div>
          </div>
        </div>

        {/* Preview link card — hidden when the artifact is gone */}
        {!isDeleted && !isAbuseFlag && !isExpired && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Preview link</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={previewUrl}
                className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 border border-gray-200 focus:outline-none"
              />
              <CopyButton value={previewUrl} />
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-blue-500 hover:text-blue-600 text-sm inline-block"
            >
              Open preview →
            </a>
          </div>
        )}

        {/* Danger zone — only when still live */}
        {!isDeleted && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Danger zone
            </p>
            <DeleteButton slug={slug} token={token} />
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Bookmark this page to check views or delete later · Don&apos;t share this URL
        </p>

      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------

function renderUnauthorized() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
        <h1 className="text-lg font-semibold text-gray-900">Not found</h1>
        <p className="text-sm text-gray-500">
          This artifact doesn&apos;t exist, or the manage link is invalid.
        </p>
        <a href="/" className="text-sm text-blue-500 hover:text-blue-600 block">
          Upload a new artifact →
        </a>
      </div>
    </main>
  );
}

function renderError(message: string) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
        <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </main>
  );
}
