import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../../lib/mongodb';
import Post from '../../../../../models/Post';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * API handler for bookmarking/unbookmarking a post.
 * Requires POST method and a valid JWT token.
 * Toggles the bookmark status of a post for the authenticated user.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect(); // Connect to MongoDB

  // Authenticate user with JWT
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }; // Decode token to get user ID
    const { id } = req.query; // Get post ID from query parameters

    const post = await Post.findById(id); // Find the post
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = decoded.userId; // ID of the authenticated user
    const index = post.bookmarks.findIndex(bookmarkId => bookmarkId.toString() === userId); // Check if user already bookmarked the post

    if (index >= 0) {
      // If already bookmarked, unbookmark (remove from bookmarks array)
      post.bookmarks.splice(index, 1);
    } else {
      // If not bookmarked, bookmark (add to bookmarks array)
      post.bookmarks.push(userId);
    }

    await post.save(); // Save the updated post
    // Return updated bookmarks count
    res.status(200).json({ bookmarksCount: post.bookmarks.length });
  } catch (error) {
    console.error('Bookmark/Unbookmark post error:', error); // Log the error for debugging
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}