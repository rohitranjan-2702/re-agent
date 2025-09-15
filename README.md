# AI Chatbot

A modern AI chatbot built with Next.js, featuring conversational AI, semantic search, and user authentication.

## Features

- 🤖 AI conversations powered by Google Generative AI
- 🧠 **Contextual Memory**: AI remembers important details from previous conversations
- 🔍 Semantic search through conversation history with Pinecone
- 🔐 Google OAuth authentication with NextAuth
- 💾 Conversation persistence with Prisma
- 🎨 Modern UI built with Tailwind CSS and Radix UI

## Local Setup

### Prerequisites

- Node.js 18+ and pnpm
- A PostgreSQL database (local or cloud)
- Google Cloud Platform account for AI and OAuth
- Pinecone account (optional, for semantic search)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd ai-chatbot
pnpm install
```

### 2. Environment Setup

Copy the example environment file and configure:

```bash
cp env.example .env.local
```

Update `.env.local` with your credentials:

```bash
# Required: Google Generative AI for chat
GOOGLE_GENERATIVE_AI_API_KEY="your-google-ai-api-key"

# Required: NextAuth configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-key"

# Required: Google OAuth credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Required: Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/ai-chatbot"

# Optional: Pinecone for semantic search (if not set, uses basic text search)
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_INDEX="your-pinecone-index-name"

# Optional: Google Search integration
GOOGLE_SEARCH_ENGINE_ID="your-search-engine-id"

# Optional: Conversation Context Settings
ENABLE_CONVERSATION_CONTEXT="true"  # Enable contextual memory (default: true)
MAX_CONTEXT_TOKENS="1500"           # Max tokens for context (default: 1500)
```

### 3. API Keys Setup

#### Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create an API key for Gemini

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs

#### Pinecone Setup (Optional)

1. Sign up at [Pinecone](https://pinecone.io)
2. Create a new index with dimension 768
3. Copy your API key and index name

### 4. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# (Optional) Open Prisma Studio to view data
pnpm db:studio
```

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Prisma Studio
- `pnpm db:push` - Push schema changes to database

## Architecture

- **Frontend**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with Radix UI components
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Google Generative AI (Gemini)
- **Search**: Pinecone for semantic search (with fallback to text search)
- **Real-time**: Server-sent events for streaming responses

## Notes

- Pinecone is optional - the app will gracefully fall back to basic text search if not configured
- Make sure your database is running before starting the development server
- The app uses Turbopack for faster development builds
