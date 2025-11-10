import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../lib/mongodb';
import Post from '../../../../models/Post';
// No need to import User explicitly if populated in Post model

/**
 * API handler for fetching all posts.
 * Allows only GET method.
 * Retrieves most recent posts, populating author details.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect(); // Connect to MongoDB

  try {
    // Find all posts, sort by creation date (newest first), and populate author details
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('author', 'email isAdmin'); // Populate only email and isAdmin fields of author

    // Transform the posts to match our TypeScript interface, ensuring proper typing for client-side consumption
    const formattedPosts = posts.map(post => ({
      _id: post._id.toString(),
      content: post.content,
      author: {
        _id: (post.author as any)._id.toString(),
        email: (post.author as any).email,
        isAdmin: (post.author as any).isAdmin,
        createdAt: (post.author as any).createdAt, // Assuming createdAt is also populated for author
      },
      likes: post.likes.map((id: any) => id.toString()),
      bookmarks: post.bookmarks.map((id: any) => id.toString()),
      shares: post.shares,
      createdAt: post.createdAt,
    }));

    res.status(200).json(formattedPosts);
  } catch (error) {
    console.error('Fetch posts error:', error); // Log the error for debugging
    res.status(500).json({ message: 'Server error during fetching posts' });
  }
}