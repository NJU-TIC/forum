# NJU-TIC Forum - Development Documentation

## Project Architecture

### Technology Stack
- **Frontend**: Next.js 14+ with App Router
- **Backend**: Next.js API Routes (Serverless Functions)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **State Management**: React Context API
- **Styling**: Tailwind CSS
- **Runtime**: Bun

### Project Structure

```
forum/
├── app/                          # Next.js App Router (processed UI)
│   ├── api/                      # API routes (backend)
│   │   ├── auth/                  # Authentication endpoints
│   │   ├── posts/                 # Post CRUD operations
│   │   └── admin/                # Admin-specific endpoints
│   ├── admin/                    # Admin dashboard UI
│   ├── layout.tsx               # Root layout with providers
│   └── page.tsx                 # Home page
├── components/                   # Reusable UI components
│   ├── auth/                    # Authentication components
│   ├── posts/                   # Post-related components
│   ├── layout/                  # Layout components
│   └── error/                   # Error handling components
├── models/                      # Database schemas (Mongoose)
├── lib/                        # Utility libraries
├── types/                       # TypeScript interfaces共享的接口定义
└── hooks/                       # Custom React hooks

```

### Data Architecture

#### User Model
- `_id`: MongoDB Object ID
- `email`: Email (unique identifier)
- `password`: Hashed password (bcrypt)
- `isAdmin`: Boolean flag for admin privileges
- `createdAt`: Timestamp

#### Post Model
- `_id`: MongoDB Object ID
- `content`: Post text content
- `author`: Reference to User model
- `likes`: Array of User IDs (likes)
- `bookmarks`: Array of User IDs (bookmarks)
- `shares`: Array of share URLs
- `createdAt`: Timestamp

### Authentication Flow

1. **Registration**: Email/password → bcrypt hash → store in MongoDB
2. **Login**: Validate credentials → create JWT token → return token + user data
3. **Authorization**: JWT token in Authorization header → verify middleware
4. **State Management**: Token stored in localStorage + React Context

### Post Management Flow

1. **Create Post**: Authenticated user → POST /api/posts/create
2. **View Posts**: GET /api/posts → populate author data
3. **Delete Post**: Author/Admin → DELETE /api/posts/[id]
4. **Engagement**: Like/Bookmark/Share → POST /api/posts/[id]/{action}

### Admin Controls

- Admin users can delete any post
- Access via `/admin` route
- Admin status stored in User model
- Verified in API route middleware

## Development Guidelines

### Code Organization Principles

**Shared Interfaces** (Frontend/Backend): `types/interfaces.ts`
- All data structures shared across components
- Type safety across entire application

**Component Structure**:
- `components/` by feature area
- Each component in its own file
- Clear props interfaces
- Error boundaries for critical components

**API Route Structure**:
- `app/api/` following RESTful conventions
- Consistent error handling
- Input validation
- JWT verification middleware

### State Management

```typescript
// Auth Context Pattern
const AuthContext = createContext<AuthContextType>();

// Custom Hook for easy access
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### Environment Variables

Required variables in `.env.local`:
```
MONGODB_URI=mongodb://localhost:27017/forum
JWT_SECRET=your-secure-secret
```

### Database Connection Pattern

```typescript
// lib/mongodb.ts
let cached = global.mongoose;

export default function connectToMongoDB() {
  // Connection caching
  if (cached.conn) return cached.conn;
  // Connection logic
}
```

### API Route Template

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (![METHOD]) { // Method check
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Authentication
  const authHeader = req.headers.authorization;
  // JWT verification

  // Business logic
}
```

## Getting Started for Developers

### Development Setup

1. **Dependencies**: Uses Bun package manager
2. **Database**: MongoDB required locally
3. **Environment**: `.env.local` config
4. **Start**: `bun run dev`

### Component Development

**Component Creation Template**:
```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

interface ComponentProps {
  // Props interface
}

export default function Component({}: ComponentProps) {
  // Component logic
  return JSX;
}
```

### API Development

**API Route Template**:
```typescript
// app/api/endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Model from '@/models/Model';

export async function POST(request: NextRequest) {
  // Server-side logic
  return NextResponse.json(data);
}
```

### Database Operations

**Mongoose Patterns**:
```typescript
// Queries with population
const posts = await Post.find()
  .populate('author', 'email isAdmin')
  .sort({ createdAt: -1 });

// Transactions for updates
await Post.findByIdAndUpdate(id, { $pull: { likes: userId } });
```

## Best Practices

### Security
- JWT tokens for authentication
- bcrypt for password hashing
- Input validation on API routes
- SQL injection prevention through Mongoose

### Performance
- Database connection pooling
- Component-level state management
- Efficient data fetching
- Pagination for large datasets

### Error Handling
- Client-side error boundaries
- Server-side error objects
- User-friendly error messages
- Graceful degradation

### Code Quality
- TypeScript interfaces for type safety
- Shared types across frontend/backend
- Component composition over inheritance
- Custom hooks for reusable logic

## Key Development Patterns

### 1. Context-Provider Pattern
Used for global state (authentication)

### 2. Controller-Service Pattern
API routes handle HTTP concerns, models handle data

### 3. Component-Container Pattern
Presentational components separate from business logic

### 4. Factory Pattern
Database models configured with consistent schema

## Testing Considerations

When adding tests, follow this structure:
- Unit tests for utility functions
- Component tests for UI
- Integration tests for API routes
- E2E tests for complete user flows

## Deployment Notes

- Environment variables must be configured
- MongoDB connection string for production
- Node.js version compatibility
- Serverless function warm-up strategies
