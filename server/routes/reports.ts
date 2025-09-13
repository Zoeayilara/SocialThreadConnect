import express from 'express';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { isAuthenticated } from '../auth';

const router = express.Router();

const reportSchema = z.object({
  postId: z.number(),
  reason: z.string().min(1).max(500),
  description: z.string().optional()
});

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};


const isAdmin = (req: any, res: any, next: any) => {
  if (req.session?.userType !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Report a post
router.post('/posts/:postId', isAuthenticated, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const { reason, description } = reportSchema.parse({
      postId,
      ...req.body
    });

    const userId = req.userId;

    // Get user and post information
    // Use SQLite database from request
    const db = (req as any).db || require('../db').sqlite;
    
    const userQuery = `SELECT firstName, lastName, email FROM users WHERE id = ?`;
    const postQuery = `
      SELECT p.content, p.created_at, u.firstName, u.lastName, u.email as author_email 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = ?
    `;

    const user = db.prepare(userQuery).get(userId);
    const post = db.prepare(postQuery).get(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Create reports table if it doesn't exist
    const createReportsTable = `
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        reporter_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        reviewed_at TEXT,
        reviewed_by INTEGER,
        admin_notes TEXT,
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (reporter_id) REFERENCES users(id),
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
      )
    `;
    
    db.prepare(createReportsTable).run();
    
    // Insert report into database
    const insertReport = `
      INSERT INTO reports (post_id, reporter_id, reason, description, created_at, status)
      VALUES (?, ?, ?, ?, datetime('now'), 'pending')
    `;
    
    db.prepare(insertReport).run(postId, userId, reason, description || '');

    // Send email to admin
    const transporter = createTransporter();
    
    const emailContent = `
      <h2>🚨 New Post Report</h2>
      
      <h3>Report Details:</h3>
      <p><strong>Reason:</strong> ${reason}</p>
      ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
      <p><strong>Reported by:</strong> ${user.firstName} ${user.lastName} (${user.email})</p>
      <p><strong>Report Date:</strong> ${new Date().toLocaleString()}</p>
      
      <h3>Reported Post:</h3>
      <p><strong>Author:</strong> ${post.firstName} ${post.lastName} (${post.author_email})</p>
      <p><strong>Post Date:</strong> ${new Date(post.created_at).toLocaleString()}</p>
      <p><strong>Content:</strong></p>
      <blockquote style="background: #f5f5f5; padding: 10px; border-left: 4px solid #ccc;">
        ${post.content}
      </blockquote>
      
      <p><strong>Post ID:</strong> ${postId}</p>
      
      <hr>
      <p><em>Please review this report and take appropriate action through the admin dashboard.</em></p>
    `;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: 'Entreefox@gmail.com',
      subject: `🚨 Post Report - ${reason}`,
      html: emailContent,
    });

    res.json({ 
      success: true, 
      message: 'Report submitted successfully. Our team will review it shortly.' 
    });

  } catch (error) {
    console.error('Report submission error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Get all reports (admin only)
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        r.*,
        u.firstName as reporter_firstName,
        u.lastName as reporter_lastName,
        u.email as reporter_email,
        p.content as post_content,
        p.created_at as post_created_at,
        author.firstName as author_firstName,
        author.lastName as author_lastName,
        author.email as author_email
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      JOIN posts p ON r.post_id = p.id
      JOIN users author ON p.user_id = author.id
      ORDER BY r.created_at DESC
    `;

    const db = (req as any).db || require('../db').sqlite;
    const reports = db.prepare(query).all();
    res.json(reports);

  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Update report status (admin only)
router.patch('/:reportId/status', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const reportId = parseInt(req.params.reportId);
    const { status, admin_notes } = req.body;

    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateQuery = `
      UPDATE reports 
      SET status = ?, admin_notes = ?, reviewed_at = datetime('now'), reviewed_by = ?
      WHERE id = ?
    `;

    const userId = req.userId;
    const db = (req as any).db || require('../db').sqlite;
    db.prepare(updateQuery).run(status, admin_notes || '', userId, reportId);

    res.json({ success: true, message: 'Report status updated' });

  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
});

export default router;
