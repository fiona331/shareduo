import { redirect } from "next/navigation";

// /delete/:slug is now a legacy alias — the page has been repurposed into
// /manage/:slug (view counts + delete). Preserve the query string (?token=…)
// so old bookmarks still work.

export const metadata = {
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

export default async function LegacyDeletePage(props: PageProps) {
  const { slug } = await props.params;
  const sp = await props.searchParams;

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") qs.set(k, v);
    else if (Array.isArray(v) && v.length > 0) qs.set(k, v[0]);
  }
  const query = qs.toString();
  redirect(`/manage/${slug}${query ? `?${query}` : ""}`);
}
