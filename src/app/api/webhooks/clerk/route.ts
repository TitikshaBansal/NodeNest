import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing svix headers");
    return new Response("Error: Missing svix headers", { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error: Invalid signature", { status: 400 });
  }

  // Handle the webhook
  const eventType = evt.type;
  console.log(`Received webhook: ${eventType}`);
  
  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const email = email_addresses[0]?.email_address;
    const name = first_name || last_name ? `${first_name || ""} ${last_name || ""}`.trim() : null;

    if (!email) {
      console.error("No email found in webhook payload");
      return new Response("Error: No email found", { status: 400 });
    }

    try {
      // Upsert user in database
      const user = await prisma.user.upsert({
        where: { clerkId: id },
        update: {
          email,
          name: name || undefined,
          imageUrl: image_url || undefined,
        },
        create: {
          clerkId: id,
          email,
          name: name || undefined,
          imageUrl: image_url || undefined,
        },
      });

      console.log(`✓ User ${eventType === "user.created" ? "created" : "updated"}: ${user.email} (${user.id})`);
      return new Response("Success", { status: 200 });
    } catch (error: any) {
      console.error("Database error:", error);
      return new Response(`Error: Database error - ${error.message}`, { status: 500 });
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;
    
    if (!id) {
      console.error("No user ID in delete webhook");
      return new Response("Error: No user ID", { status: 400 });
    }

    try {
      await prisma.user.delete({
        where: { clerkId: id as string },
      });
      console.log(`✓ User deleted: ${id}`);
      return new Response("Success", { status: 200 });
    } catch (error: any) {
      console.error("Delete user error:", error);
      // User might already be deleted - don't fail the webhook
      if (error.code === "P2025") {
        console.log(`User ${id} already deleted`);
        return new Response("Success", { status: 200 });
      }
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }

  // For other event types, just acknowledge
  console.log(`Webhook received but not handled: ${eventType}`);
  return new Response("Success", { status: 200 });
}