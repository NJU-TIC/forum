import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/mongodb';
import Post from '../../../models/Post';
import User from '../../../models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect();

  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('author', 'email isAdmin');

    // Transform the posts to match our TypeScript interface
    const formattedPosts = posts.map(post => ({
      _id: post._id.toString(),
      content: post.content,
      author: {
        _id: post.author._id.toString(),
        email: post.author.email,
        isAdmin: post.author.isAdmin,
        createdAt: post.author.createdAt,
      },
      likes: post.likes.map((id: any) => id.toString()),
      bookmarks: post.bookmarks.map((id: any) => id.toString()),
      shares: post.shares,
      createdAt: post.createdAt,
    }));

    res.status(200).json(formattedPosts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
}