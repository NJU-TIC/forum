import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../lib/mongodb';
import Post from '../../../../models/Post';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * API handler for creating new posts.
 * Requires POST method with 'content' in body and a valid JWT token in Authorization header.
 * Creates a new post associated with the authenticated user.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect();

  // Authenticate user with JWT
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }; // Decode token to get user ID
    const { content } = req.body; // Extract post content

    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    // Create new post
    const post = new Post({
      content,
      author: decoded.userId, // Set author to authenticated user's ID
    });

    await post.save(); // Save post to database

    // Populate author information before returning
    await post.populate('author', 'email isAdmin');

    res.status(201).json({ post });
  } catch (error) {
    console.error('Create post error:', error); // Log the error for debugging
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}