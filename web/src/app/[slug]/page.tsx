import { redirect } from "next/navigation";

export default function SlugPage({ params }: { params: { slug: string } }) {
  const previewBase =
    process.env.PREVIEW_BASE_URL ?? "http://localhost:3001";
  redirect(`${previewBase}/${params.slug}`);
}
