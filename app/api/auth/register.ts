import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User'; // Changed path
import bcrypt from 'bcryptjs';

/**
 * API handler for user registration.
 * Requires POST method with email and password in the request body.
 * Hashes the password and saves the new user to the database.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect(); // Connect to MongoDB
  const { email, password } = req.body; // Extract email and password from request body

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password before saving to database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user instance
    const user = new User({
      email,
      password: hashedPassword,
      isAdmin: false, // Default to non-admin
    });

    await user.save(); // Save the new user
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Registration error:', error); // Log the error for debugging
    res.status(500).json({ message: 'Server error during registration' });
  }
}