export interface User {
  _id: string;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface Post {
  _id: string;
  content: string;
  author: User;
  likes: string[];
  bookmarks: string[];
  shares: string[];
  createdAt: Date;
}