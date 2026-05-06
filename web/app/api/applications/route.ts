import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Application from "@/lib/db/models/application";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit  = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const offset = Number(searchParams.get("offset") ?? 0);

  await connectDB();
  const query: Record<string, unknown> = { userId };
  if (status && status !== "all") query.status = status;

  const [apps, total] = await Promise.all([
    Application.find(query).sort({ appliedAt: -1 }).skip(offset).limit(limit).lean(),
    Application.countDocuments(query),
  ]);

  return NextResponse.json({ apps, total, limit, offset });
}
