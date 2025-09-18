import { db } from "./db";
import {
  users,
  posts,
  likes,
  reposts,
  follows,
  comments,
  savedPosts,
  otps,
  type User,
  type Post,
  type InsertPost,
  type Comment,
  type InsertComment,
  type Otp,
  type InsertOtp,
} from "../shared/schema";
import { eq, desc, sql, and, ne } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getPosts(limit?: number, offset?: number, sortBy?: string): Promise<(Post & { user: User; isLiked?: boolean; isReposted?: boolean; likesCount: number; commentsCount: number; repostsCount: number })[]>;
  getPostById(id: number): Promise<Post | undefined>;
  updatePost(id: number, userId: number, content: string): Promise<Post | undefined>;
  deletePost(id: number, userId: number): Promise<boolean>;
  
  // Like operations
  likePost(userId: number, postId: number): Promise<void>;
  unlikePost(userId: number, postId: number): Promise<void>;
  isPostLiked(userId: number, postId: number): Promise<boolean>;
  
  // Comment operations
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByPostId(postId: number): Promise<(Comment & { user: User; replies?: (Comment & { user: User })[] })[]>;
  getRepliesByCommentId(commentId: number): Promise<(Comment & { user: User })[]>;
  
  // Follow operations
  followUser(followerId: number, followingId: number): Promise<void>;
  unfollowUser(followerId: number, followingId: number): Promise<void>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;
  getFollowerCount(userId: number): Promise<number>;
  getUserPosts(userId: number): Promise<(Post & { user: User; isLiked?: boolean; likesCount: number; commentsCount: number })[]>;
  getUserReposts(userId: number): Promise<(Post & { user: User; isLiked?: boolean; likesCount: number; commentsCount: number; repostsCount: number })[]>;
  updateUserProfile(userId: number, profileData: { firstName?: string; lastName?: string; bio?: string; link?: string; isPrivate?: boolean; universityHandle?: string }): Promise<void>;
  
  // Repost operations
  toggleRepost(userId: number, postId: number): Promise<{ isReposted: boolean; repostsCount: number }>;
  isPostReposted(userId: number, postId: number): Promise<boolean>;
  
  // Notifications
  getNotifications(userId: number): Promise<any[]>;
  
  // OTP operations
  createOtp(otpData: InsertOtp): Promise<Otp>;

  // Saved posts operations
  savePost(userId: number, postId: number): Promise<void>;
  unsavePost(userId: number, postId: number): Promise<void>;
  getSavedPosts(userId: number): Promise<any[]>;
  isPostSaved(userId: number, postId: number): Promise<boolean>;

  // Notifications
  getNotifications(userId: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (user && user.profileImageUrl && user.profileImageUrl.includes('localhost:5000')) {
      user.profileImageUrl = user.profileImageUrl.replace('http://localhost:5000', this.getBaseUrl());
    }
    return user;
  }

  private getBaseUrl(): string {
    if (process.env.BASE_URL) {
      return process.env.BASE_URL;
    }
    
    // For Railway deployment, detect by checking for Railway environment variables
    if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) {
      return 'https://web-production-aff5b.up.railway.app';
    }
    
    // For production environments (non-Railway)
    if (process.env.NODE_ENV === 'production') {
      return 'https://web-production-aff5b.up.railway.app';
    }
    
    // Fallback to localhost for development
    return 'http://localhost:5000';
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user && user.profileImageUrl && user.profileImageUrl.includes('localhost:5000')) {
      user.profileImageUrl = user.profileImageUrl.replace('http://localhost:5000', this.getBaseUrl());
    }
    return user;
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = Math.floor(Date.now() / 1000);
    const [user] = await db.insert(users).values({
      ...userData,
      createdAt: now,
      updatedAt: now
    }).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Post operations
  async createPost(post: InsertPost): Promise<Post> {
    const now = Math.floor(Date.now() / 1000);
    const [newPost] = await db.insert(posts).values({
      ...post,
      createdAt: now,
      updatedAt: now
    }).returning();
    return newPost;
  }

  async getPosts(limit = 10, offset = 0, sortBy = 'algorithm'): Promise<(Post & { user: User; isLiked?: boolean; isReposted?: boolean; likesCount: number; commentsCount: number; repostsCount: number })[]> {
    // Get all posts with user data
    const postsWithUsers = await db
      .select()
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt));

    // Map to proper format with URL replacement
    const allPosts = postsWithUsers.map(p => ({
      id: p.posts.id,
      userId: p.posts.userId,
      content: p.posts.content,
      imageUrl: p.posts.imageUrl?.includes?.('localhost:5000') 
        ? p.posts.imageUrl.replace('http://localhost:5000', this.getBaseUrl()) 
        : p.posts.imageUrl,
      mediaUrl: p.posts.mediaUrl?.includes?.('localhost:5000') 
        ? p.posts.mediaUrl.replace('http://localhost:5000', this.getBaseUrl()) 
        : p.posts.mediaUrl,
      mediaType: p.posts.mediaType,
      likesCount: p.posts.likesCount || 0,
      commentsCount: p.posts.commentsCount || 0,
      repostsCount: p.posts.repostsCount || 0,
      createdAt: p.posts.createdAt,
      updatedAt: p.posts.updatedAt,
      user: {
        ...p.users!,
        profileImageUrl: p.users!.profileImageUrl?.includes('localhost:5000')
          ? p.users!.profileImageUrl.replace('http://localhost:5000', this.getBaseUrl())
          : p.users!.profileImageUrl
      },
    }));

    let sortedPosts;
    
    switch (sortBy) {
      case 'recent':
        // Simple chronological order (newest first)
        sortedPosts = allPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
        
      case 'popular':
        // Sort by total engagement (likes + comments + reposts)
        sortedPosts = allPosts.sort((a, b) => {
          const aEngagement = a.likesCount + a.commentsCount + a.repostsCount;
          const bEngagement = b.likesCount + b.commentsCount + b.repostsCount;
          return bEngagement - aEngagement;
        });
        break;
        
      case 'algorithm':
      default:
        // Apply Threads-like algorithm
        const scoredPosts = this.calculateEngagementScores(allPosts);
        // Add randomization to prevent same order on refresh
        sortedPosts = this.addRandomization(scoredPosts);
        break;
    }
    
    // Apply pagination
    return sortedPosts.slice(offset, offset + limit);
  }

  private calculateEngagementScores(posts: any[]): any[] {
    const now = Math.floor(Date.now() / 1000);
    
    return posts.map(post => {
      // Time decay factor (newer posts get higher scores)
      const ageInHours = (now - (post.createdAt || 0)) / 3600;
      const timeDecay = Math.exp(-ageInHours / 24); // Decay over 24 hours
      
      // Engagement score based on likes, comments, and reposts
      const engagementScore = (
        (post.likesCount * 1.0) +
        (post.commentsCount * 2.0) + // Comments weighted higher
        (post.repostsCount * 1.5)
      );
      
      // Give fresh posts (less than 2 hours old) a significant boost
      const freshBoost = ageInHours < 2 ? 3.0 : 0;
      
      // Combined score with time decay and fresh boost
      const finalScore = (engagementScore + freshBoost + 1) * timeDecay;
      
      return {
        ...post,
        engagementScore: finalScore
      };
    }).sort((a, b) => b.engagementScore - a.engagementScore);
  }

  private addRandomization(posts: any[]): any[] {
    // Group posts by engagement tiers
    const highEngagement = posts.filter(p => p.engagementScore > 5);
    const mediumEngagement = posts.filter(p => p.engagementScore > 1 && p.engagementScore <= 5);
    const lowEngagement = posts.filter(p => p.engagementScore <= 1);
    
    // Shuffle within each tier to add variety
    const shuffleArray = (array: any[]) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    // Combine tiers with some randomization
    const result = [
      ...shuffleArray(highEngagement),
      ...shuffleArray(mediumEngagement),
      ...shuffleArray(lowEngagement)
    ];
    
    // Add some cross-tier mixing for variety (10% chance to promote lower tier posts)
    const finalResult: any[] = [];
    for (let i = 0; i < result.length; i++) {
      finalResult.push(result[i]);
      
      // Occasionally inject a post from a lower tier
      if (Math.random() < 0.1 && i < result.length - 1) {
        const remainingPosts = result.slice(i + 1);
        if (remainingPosts.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(5, remainingPosts.length));
          const promotedPost = remainingPosts[randomIndex];
          if (promotedPost) {
            finalResult.push(promotedPost);
            result.splice(i + 1 + randomIndex, 1);
          }
        }
      }
    }
    
    return finalResult;
  }

  async getPostById(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async updatePost(id: number, userId: number, content: string): Promise<Post | undefined> {
    const now = Math.floor(Date.now() / 1000);
    
    // First check if the post exists and belongs to the user
    const existingPost = await this.getPostById(id);
    if (!existingPost || existingPost.userId !== userId) {
      return undefined;
    }
    
    await db
      .update(posts)
      .set({ content, updatedAt: now })
      .where(eq(posts.id, id));
    
    return await this.getPostById(id);
  }

  async deletePost(id: number, userId: number): Promise<boolean> {
    // First check if the post exists and belongs to the user
    const existingPost = await this.getPostById(id);
    if (!existingPost || existingPost.userId !== userId) {
      return false;
    }
    
    // Delete associated likes and comments first
    await db.delete(likes).where(eq(likes.postId, id));
    await db.delete(comments).where(eq(comments.postId, id));
    
    // Delete the post
    await db.delete(posts).where(eq(posts.id, id));
    
    return true;
  }

  // Like operations
  async likePost(userId: number, postId: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.insert(likes).values({ userId, postId, createdAt: now });
    
    // Update likes count
    await db
      .update(posts)
      .set({
        likesCount: sql`${posts.likesCount} + 1`,
      })
      .where(eq(posts.id, postId));
  }

  async unlikePost(userId: number, postId: number): Promise<void> {
    await db
      .delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    
    // Update likes count with constraint to prevent negative values
    await db
      .update(posts)
      .set({
        likesCount: sql`CASE WHEN ${posts.likesCount} > 0 THEN ${posts.likesCount} - 1 ELSE 0 END`,
      })
      .where(eq(posts.id, postId));
  }

  async isPostLiked(userId: number, postId: number): Promise<boolean> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return !!like;
  }

  // Comment operations
  async createComment(comment: InsertComment): Promise<Comment> {
    const now = Math.floor(Date.now() / 1000);
    const [newComment] = await db
      .insert(comments)
      .values({ ...comment, createdAt: now })
      .returning();
    
    // Update the post's comment count
    await db
      .update(posts)
      .set({
        commentsCount: sql`${posts.commentsCount} + 1`,
      })
      .where(eq(posts.id, comment.postId));
    
    // If this is a reply, update parent comment's replies count
    if (comment.parentId) {
      await db
        .update(comments)
        .set({
          repliesCount: sql`${comments.repliesCount} + 1`,
        })
        .where(eq(comments.id, comment.parentId));
    }
    
    return newComment;
  }

  async getCommentsByPostId(postId: number): Promise<(Comment & { user: User; replies?: (Comment & { user: User })[] })[]> {
    // Get top-level comments (no parent)
    const topLevelComments = await db
      .select()
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(and(eq(comments.postId, postId), sql`${comments.parentId} IS NULL`))
      .orderBy(desc(comments.createdAt));

    const result: (Comment & { user: User; replies?: (Comment & { user: User })[] })[] = [];
    for (const c of topLevelComments) {
      const comment = {
        id: c.comments.id,
        userId: c.comments.userId,
        postId: c.comments.postId,
        parentId: c.comments.parentId,
        content: c.comments.content,
        repliesCount: c.comments.repliesCount || 0,
        createdAt: c.comments.createdAt,
        user: c.users!,
        replies: [] as (Comment & { user: User })[]
      };
      
      // Get replies for this comment
      const replies = await this.getRepliesByCommentId(comment.id);
      comment.replies = replies;
      
      result.push(comment);
    }

    return result;
  }

  async getRepliesByCommentId(commentId: number): Promise<(Comment & { user: User })[]> {
    const replies = await db
      .select()
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.parentId, commentId))
      .orderBy(comments.createdAt);

    return replies.map(r => ({
      id: r.comments.id,
      userId: r.comments.userId,
      postId: r.comments.postId,
      parentId: r.comments.parentId,
      content: r.comments.content,
      repliesCount: r.comments.repliesCount || 0,
      createdAt: r.comments.createdAt,
      user: r.users!,
    }));
  }


  // Follow operations
  async followUser(followerId: number, followingId: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db.insert(follows).values({ followerId, followingId, createdAt: now });
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const follow = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);
    
    return follow.length > 0;
  }

  async getFollowerCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followingId, userId));
    
    return result[0]?.count || 0;
  }

  // Repost operations
  async toggleRepost(userId: number, postId: number): Promise<{ isReposted: boolean; repostsCount: number }> {
    const existingRepost = await db
      .select()
      .from(reposts)
      .where(and(eq(reposts.userId, userId), eq(reposts.postId, postId)))
      .limit(1);

    if (existingRepost.length > 0) {
      // Remove repost
      await db
        .delete(reposts)
        .where(and(eq(reposts.userId, userId), eq(reposts.postId, postId)));
      
      // Decrease repost count
      await db
        .update(posts)
        .set({
          repostsCount: sql`${posts.repostsCount} - 1`,
        })
        .where(eq(posts.id, postId));
    } else {
      // Add repost
      const now = Math.floor(Date.now() / 1000);
      await db.insert(reposts).values({
        userId,
        postId,
        createdAt: now
      });
      
      // Increase repost count
      await db
        .update(posts)
        .set({
          repostsCount: sql`${posts.repostsCount} + 1`,
        })
        .where(eq(posts.id, postId));
    }

    // Get updated repost count
    const updatedPost = await db
      .select({ repostsCount: posts.repostsCount })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    return {
      isReposted: existingRepost.length === 0,
      repostsCount: updatedPost[0]?.repostsCount || 0
    };
  }

  async isPostReposted(userId: number, postId: number): Promise<boolean> {
    const repost = await db
      .select()
      .from(reposts)
      .where(and(eq(reposts.userId, userId), eq(reposts.postId, postId)))
      .limit(1);
    
    return repost.length > 0;
  }

  // OTP operations
  async createOtp(otp: InsertOtp): Promise<Otp> {
    const now = Math.floor(Date.now() / 1000);
    const [newOtp] = await db.insert(otps).values({
      ...otp,
      createdAt: now
    }).returning();
    return newOtp;
  }

  async getValidOtp(email: string, code: string): Promise<Otp | undefined> {
    const now = Math.floor(Date.now() / 1000);
    const [otp] = await db
      .select()
      .from(otps)
      .where(
        and(
          eq(otps.email, email),
          eq(otps.code, code),
          eq(otps.isUsed, 0), // 0 = false, 1 = true for SQLite
          sql`${otps.expiresAt} > ${now}`
        )
      );
    return otp;
  }

  async markOtpAsUsed(id: number): Promise<void> {
    await db
      .update(otps)
      .set({ isUsed: 1 })
      .where(eq(otps.id, id));
  }

  async getUserPosts(userId: number): Promise<(Post & { user: User; isLiked?: boolean; likesCount: number; commentsCount: number })[]> {
    const postsWithUsers = await db
      .select()
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));

    return postsWithUsers.map(p => ({
      id: p.posts.id,
      userId: p.posts.userId,
      content: p.posts.content,
      imageUrl: p.posts.imageUrl,
      mediaUrl: p.posts.mediaUrl,
      mediaType: p.posts.mediaType,
      likesCount: p.posts.likesCount || 0,
      commentsCount: p.posts.commentsCount || 0,
      repostsCount: p.posts.repostsCount || 0,
      createdAt: p.posts.createdAt,
      updatedAt: p.posts.updatedAt,
      user: p.users!,
    }));
  }

  async getUserReposts(userId: number): Promise<(Post & { user: User; isLiked?: boolean; likesCount: number; commentsCount: number; repostsCount: number })[]> {
    const repostedPosts = await db
      .select()
      .from(reposts)
      .leftJoin(posts, eq(reposts.postId, posts.id))
      .leftJoin(users, eq(posts.userId, users.id))
      .where(eq(reposts.userId, userId))
      .orderBy(desc(reposts.createdAt));

    return repostedPosts.map(r => ({
      id: r.posts!.id,
      userId: r.posts!.userId,
      content: r.posts!.content,
      imageUrl: r.posts!.imageUrl,
      mediaUrl: r.posts!.mediaUrl,
      mediaType: r.posts!.mediaType,
      likesCount: r.posts!.likesCount || 0,
      commentsCount: r.posts!.commentsCount || 0,
      repostsCount: r.posts!.repostsCount || 0,
      createdAt: r.posts!.createdAt,
      updatedAt: r.posts!.updatedAt,
      user: r.users!,
    }));
  }

  async updateUserProfile(userId: number, profileData: { firstName?: string; lastName?: string; bio?: string; link?: string; isPrivate?: boolean; university?: string }): Promise<void> {
    // Convert boolean to integer for SQLite compatibility
    const sqliteData = {
      ...profileData,
      isPrivate: profileData.isPrivate !== undefined ? (profileData.isPrivate ? 1 : 0) : undefined
    };
    
    await db
      .update(users)
      .set(sqliteData)
      .where(eq(users.id, userId));
  }

  async getNotifications(userId: number): Promise<any[]> {
    // Get comments on user's posts
    const commentNotifications = await db
      .select({
        id: comments.id,
        type: sql<string>`'comment'`,
        message: sql<string>`'commented on your post'`,
        createdAt: comments.createdAt,
        userId: comments.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        postId: comments.postId
      })
      .from(comments)
      .innerJoin(posts, eq(comments.postId, posts.id))
      .innerJoin(users, eq(comments.userId, users.id))
      .where(and(eq(posts.userId, userId), ne(comments.userId, userId)))
      .orderBy(desc(comments.createdAt))
      .limit(50);

    // Get likes on user's posts
    const likeNotifications = await db
      .select({
        id: likes.id,
        type: sql<string>`'like'`,
        message: sql<string>`'liked your post'`,
        createdAt: likes.createdAt,
        userId: likes.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        postId: likes.postId
      })
      .from(likes)
      .innerJoin(posts, eq(likes.postId, posts.id))
      .innerJoin(users, eq(likes.userId, users.id))
      .where(and(eq(posts.userId, userId), ne(likes.userId, userId)))
      .orderBy(desc(likes.createdAt))
      .limit(50);

    // Get follow notifications
    const followNotifications = await db
      .select({
        id: follows.id,
        type: sql<string>`'follow'`,
        message: sql<string>`'followed you'`,
        createdAt: follows.createdAt,
        userId: follows.followerId,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        postId: sql<number>`NULL`
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId))
      .orderBy(desc(follows.createdAt))
      .limit(50);

    // Combine and sort all notifications
    const allNotifications = [...commentNotifications, ...likeNotifications, ...followNotifications]
      .map(notification => ({
        id: notification.id,
        type: notification.type,
        message: notification.message,
        user: {
          id: notification.userId,
          firstName: notification.firstName,
          lastName: notification.lastName,
          profileImageUrl: notification.profileImageUrl
        },
        createdAt: notification.createdAt ? new Date(notification.createdAt * 1000).toISOString() : new Date().toISOString(),
        isRead: false,
        postId: notification.postId
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    return allNotifications;
  }

  // Saved posts operations
  async savePost(userId: number, postId: number): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    await db.insert(savedPosts).values({
      userId,
      postId,
      createdAt: timestamp,
    });
  }

  async unsavePost(userId: number, postId: number): Promise<void> {
    await db
      .delete(savedPosts)
      .where(and(eq(savedPosts.userId, userId), eq(savedPosts.postId, postId)));
  }

  async getSavedPosts(userId: number): Promise<any[]> {
    const saved = await db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        repostsCount: posts.repostsCount,
        createdAt: posts.createdAt,
        savedAt: savedPosts.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          universityHandle: users.universityHandle,
        },
      })
      .from(savedPosts)
      .innerJoin(posts, eq(savedPosts.postId, posts.id))
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(savedPosts.userId, userId))
      .orderBy(desc(savedPosts.createdAt));

    return saved;
  }

  async isPostSaved(userId: number, postId: number): Promise<boolean> {
    const [saved] = await db
      .select()
      .from(savedPosts)
      .where(and(eq(savedPosts.userId, userId), eq(savedPosts.postId, postId)));
    
    return !!saved;
  }
}

export const storage = new DatabaseStorage();

// Initialize session store
import { sessionStore } from "./db";
(storage as any).sessionStore = sessionStore;