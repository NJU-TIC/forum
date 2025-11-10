/**
 * User interface representing a user account in the forum system
 */
export interface User {
  _id: string;           // MongoDB Object ID
  email: string;          // User's email (used for login)
  isAdmin: boolean;       // Admin privilege flag
  createdAt: Date;        // Account creation timestamp
}

/**
 * Post interface representing a forum post with engagement features
 */
export interface Post {
  _id: string;            // MongoDB Object ID
  content: string;         // Post text content
  author: User;           // Populated user who created the post
  likes: string[];         // Array of user IDs who liked the post
  bookmarks: string[];     // Array of user IDs who bookmarked post
  shares: string[];        // Array of share URLs/metadata
  createdAt: Date;         // Post creation timestamp
}