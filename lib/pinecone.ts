import { Pinecone } from "@pinecone-database/pinecone";

// Check if Pinecone is configured
const isPineconeConfigured =
  process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX;

export const pinecone = isPineconeConfigured
  ? new Pinecone({
      apiKey: process.env.PINECONE_API_KEY as string,
    })
  : null;

export const pineconeIndex =
  isPineconeConfigured && pinecone
    ? pinecone.Index(process.env.PINECONE_INDEX as string)
    : null;

// Helper function to check if Pinecone is available
export function isPineconeAvailable(): boolean {
  return pineconeIndex !== null;
}
