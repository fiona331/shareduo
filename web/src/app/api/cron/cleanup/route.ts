import { NextRequest, NextResponse } from "next/server";
import { and, isNull, lt, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { shares } from "@/lib/db/schema";
import { deleteObject } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = await db
    .select()
    .from(shares)
    .where(and(lt(shares.expires_at, new Date()), isNull(shares.deleted_at)));

  let deleted = 0;
  for (const share of expired) {
    await deleteObject(share.storage_key).catch(() => {});
    await db
      .update(shares)
      .set({ deleted_at: new Date() })
      .where(eq(shares.id, share.id));
    deleted++;
  }

  return NextResponse.json({ deleted });
}
