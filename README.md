# NJU-TIC Forum

A Next.js-based forum application with MongoDB backend for the NJU-TIC community.

## Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally)

## Getting Started

### 1. Start MongoDB

```bash
# Using Homebrew (macOS)
brew services start mongodb-community@6.0

# Or using Docker
docker run -d -p 27017:27017 --name mongo mongo
```

### 2. Set up Environment Variables

Create a `.env.local` file in the project root with your configuration:

```env
MONGODB_URI=mongodb://localhost:27017/forum
JWT_SECRET=your-secure-random-secret-here
```

> **Note**: Replace `your-secure-random-secret-here` with a strong secret key for JWT signing.

### 3. Install Dependencies

```bash
bun install
```

### 4. Run the Development Server

```bash
bun run dev
```

The application will be available at `http://localhost:3000`.

## Application Structure

- **Frontend**: Next.js components in `app/` directory
- **API Routes**: Backend endpoints in `pages/api/`
- **Models**: MongoDB schemas in `models/`
- **State Management**: Auth context in `components/auth/`

## Key Features

✅ Email/password authentication
✅ Create and manage posts
✅ Post engagement (likes, bookmarks, share)
✅ Admin dashboard for content moderation

## Production Deployment

For production, set appropriate environment variables and run:

```bash
bun run build
bun run start
```