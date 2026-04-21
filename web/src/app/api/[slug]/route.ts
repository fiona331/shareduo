import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { shares } from "@/lib/db/schema";
import { deleteObject } from "@/lib/storage";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  let secret_token: string;
  try {
    const body = await req.json();
    secret_token = body.secret_token;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!secret_token || typeof secret_token !== "string") {
    return NextResponse.json({ error: "secret_token is required" }, { status: 400 });
  }

  const [share] = await db
    .select()
    .from(shares)
    .where(eq(shares.slug, slug))
    .limit(1);

  if (!share || share.deleted_at !== null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(secret_token, share.secret_token);
  if (!valid) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  await db
    .update(shares)
    .set({ deleted_at: new Date() })
    .where(eq(shares.slug, slug));

  await deleteObject(share.storage_key).catch(() => {
    // Storage delete is best-effort; DB soft-delete is the source of truth
  });

  return NextResponse.json({ success: true });
}
