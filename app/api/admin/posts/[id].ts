import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../lib/mongodb';
import Post from '../../../../models/Post';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; isAdmin: boolean };
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: 'Admin privileges required' });
    }

    const { id } = req.query;
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await Post.deleteOne({ _id: id });
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}