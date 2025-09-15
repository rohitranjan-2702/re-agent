import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { searchConversations } from "@/lib/conversations";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { query, topK } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response("Query is required", { status: 400 });
    }

    const results = await searchConversations({
      query,
      userId: session.user.id!,
      topK: topK || 10,
    });

    return Response.json({ results });
  } catch (error) {
    console.error("Error searching conversations:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
