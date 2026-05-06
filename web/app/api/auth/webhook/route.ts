/**
 * Clerk webhook — sync user data to MongoDB on creation/update
 */
import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/user";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing CLERK_WEBHOOK_SECRET" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id        = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.json();
  const body    = JSON.stringify(payload);

  let evt: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(body, {
      "svix-id":        svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as typeof evt;
  } catch {
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }

  await connectDB();

  if (evt.type === "user.created") {
    const d = evt.data;
    const primaryEmail = ((d.email_addresses as Array<{ email_address: string; id: string }>) ?? [])
      .find((e) => e.id === d.primary_email_address_id)?.email_address ?? "";

    await User.findOneAndUpdate(
      { clerkId: d.id as string },
      {
        clerkId:  d.id,
        email:    primaryEmail,
        fullName: [d.first_name, d.last_name].filter(Boolean).join(" "),
      },
      { upsert: true, new: true }
    );
  }

  if (evt.type === "user.updated") {
    const d = evt.data;
    const primaryEmail = ((d.email_addresses as Array<{ email_address: string; id: string }>) ?? [])
      .find((e) => e.id === d.primary_email_address_id)?.email_address ?? "";

    await User.findOneAndUpdate(
      { clerkId: d.id as string },
      { fullName: [d.first_name, d.last_name].filter(Boolean).join(" "), email: primaryEmail }
    );
  }

  if (evt.type === "user.deleted") {
    await User.deleteOne({ clerkId: evt.data.id as string });
  }

  return NextResponse.json({ received: true });
}
