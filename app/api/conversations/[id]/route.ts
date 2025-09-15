import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getConversation } from "@/lib/conversations";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    const conversationId = id;

    const conversation = await getConversation(
      conversationId,
      session.user.id!
    );

    if (!conversation) {
      return new Response("Conversation not found", { status: 404 });
    }

    return Response.json({ conversation });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
