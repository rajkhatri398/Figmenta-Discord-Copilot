# Figmenta Discord Copilot

A Discord bot with an admin dashboard for managing system instructions and conversation memory using GPT-4o-mini.

## Project Structure

- **admin-web**: Next.js 16 web dashboard for managing bot settings
- **bot**: Discord.js bot with OpenAI integration

## Setup

### 1. Environment Variables

Create `.env.local` in the `admin-web` folder:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Create `.env` in the `bot` folder:
```
DISCORD_TOKEN=your_discord_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
OPENAI_API_KEY=your_openai_api_key
```

### 2. Database Setup

Create these tables in Supabase:

**instructions table:**
- id (uuid, primary key)
- content (text)
- created_at (timestamp)

**memory table:**
- id (uuid, primary key)
- summary (text)
- created_at (timestamp)

**allowlist table:**
- id (uuid, primary key)
- channel_id (text)
- created_at (timestamp)

### 3. Install Dependencies

```bash
npm install
```

## Running the Project

### Development Mode (Both Services)

```bash
npm run dev
```

This starts both the admin dashboard and Discord bot concurrently.

### Individual Services

Admin Web Only:
```bash
npm run dev:web
```

Discord Bot Only:
```bash
npm run dev:bot
```

### Production

Build and run the admin web:
```bash
npm run build
npm start
```

Start the bot:
```bash
npm run start:bot
```

## Features

- **Admin Dashboard**: Manage system instructions and view conversation memory
- **Discord Integration**: Bot responds to messages in whitelisted channels
- **AI-Powered Responses**: Uses OpenAI's GPT-4o-mini model
- **Persistent Memory**: Conversation history stored in Supabase
- **Channel Whitelist**: Control which Discord channels the bot responds to

## Technologies

- Next.js 16 with TypeScript
- Discord.js v14
- Supabase
- OpenAI API
- Tailwind CSS
