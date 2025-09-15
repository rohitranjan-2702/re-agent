import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getConversationHistory } from "@/lib/conversations";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const conversations = await getConversationHistory(session.user.id!, limit);

    return Response.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversation history:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
