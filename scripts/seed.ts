import { createUser, createPost, clearDatabase } from "../lib/db";
import { validateUser } from "../lib/validation/user";
import { validatePost } from "../lib/validation/post";
import { generateCredentials } from "../lib/db";

async function seedDatabase() {
  try {
    console.log("Connecting to MongoDB...");
    await clearDatabase();

    // Create sample users with credentials
    console.log("Creating users...");

    const adminCredentials = await generateCredentials("admin123");
    const adminUserData = {
      name: "Admin User",
      id: "admin-user-001",
      credentials: adminCredentials,
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const userCredentials = await generateCredentials("user123");
    const regularUserData = {
      name: "Regular User",
      id: "regular-user-001",
      credentials: userCredentials,
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const anotherCredentials = await generateCredentials("another123");
    const anotherUserData = {
      name: "Another User",
      id: "another-user-001",
      credentials: anotherCredentials,
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate and create users
    const validatedAdminUser = validateUser(adminUserData);
    const validatedRegularUser = validateUser(regularUserData);
    const validatedAnotherUser = validateUser(anotherUserData);

    const adminUser = await createUser(validatedAdminUser);
    const regularUser = await createUser(validatedRegularUser);
    const anotherUser = await createUser(validatedAnotherUser);

    console.log(
      "Created users:",
      [adminUser, regularUser, anotherUser].map((u) => u.name),
    );

    // Create sample posts
    console.log("Creating posts...");
    const postsData = [
      {
        _id: "post-001",
        author: adminUser._id,
        title: "Welcome to the Forum!",
        body: {
          content:
            "This is the first post in our new forum. Feel free to share your thoughts and engage with the community!",
        },
        interactions: {
          likes: [adminUser, regularUser],
          forwards: [adminUser, regularUser],
          comments: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: "post-002",
        author: regularUser._id,
        title: "Introduction Thread",
        body: {
          content:
            "Hi everyone! I'm excited to be part of this community. Looking forward to great discussions!",
        },
        interactions: {
          likes: [adminUser, regularUser],
          forwards: [adminUser],
          comments: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: "post-003",
        author: anotherUser._id,
        title: "Best Practices for Web Development",
        body: {
          content:
            "I wanted to share some best practices I've learned over the years: 1. Write clean, readable code 2. Test thoroughly 3. Document your work 4. Stay updated with new technologies",
        },
        interactions: {
          likes: [adminUser, regularUser, anotherUser],
          forwards: [adminUser, regularUser],
          comments: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Validate and create posts
    const posts = [];
    for (const postData of postsData) {
      const validatedPost = validatePost(postData);
      const createdPost = await createPost(validatedPost);
      posts.push(createdPost);
    }

    console.log("Database seeded successfully!");
    console.log("Created posts:", posts.length);

    // Display user credentials for testing
    console.log("\nTest Users:");
    console.log(
      `- ${adminUser.name} (ID: ${adminUser._id}) - Admin: ${adminUser.isAdmin}`,
    );
    console.log(
      `- ${regularUser.name} (ID: ${regularUser._id}) - Admin: ${regularUser.isAdmin}`,
    );
    console.log(
      `- ${anotherUser.name} (ID: ${anotherUser._id}) - Admin: ${anotherUser.isAdmin}`,
    );
    console.log("\nPasswords: admin123, user123, another123");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    process.exit(0);
  }
}

seedDatabase();
