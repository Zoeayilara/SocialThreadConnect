import express from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../auth';

const router = express.Router();

const reportSchema = z.object({
  postId: z.number(),
  reason: z.string().min(1).max(500),
  description: z.string().optional()
});

const isAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.userId;
    const db = (req as any).db || require('../db').sqlite;
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(userId);
    
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Admin verification failed' });
  }
};

// Report a post
router.post('/posts/:postId', isAuthenticated, async (req: any, res) => {
  try {
    console.log('🚨 Report submission started');
    console.log('📝 Request params:', req.params);
    console.log('📝 Request body:', req.body);
    console.log('📝 User ID:', req.userId);
    
    const postId = parseInt(req.params.postId);
    const { reason, description } = reportSchema.parse({
      postId,
      ...req.body
    });

    const userId = req.userId;
    console.log('✅ Validation passed - postId:', postId, 'userId:', userId, 'reason:', reason);

    // Get user and post information
    // Use SQLite database from request
    const db = (req as any).db || require('../db').sqlite;
    
    const userQuery = `SELECT first_name as firstName, last_name as lastName, email FROM users WHERE id = ?`;
    const postQuery = `
      SELECT p.content, p.created_at, u.first_name as firstName, u.last_name as lastName, u.email as author_email 
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
    
    console.log('📝 Inserting report into database:', { postId, userId, reason, description });
    db.prepare(insertReport).run(postId, userId, reason, description || '');
    console.log('✅ Report saved to database successfully');

    res.json({ 
      success: true, 
      message: 'Report submitted successfully. Our team will review it shortly.' 
    });

  } catch (error) {
    console.error('❌ Report submission error:', error);
    
    // Provide more specific error information
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.errors);
      return res.status(400).json({ error: 'Invalid report data', details: error.errors });
    }
    
    res.status(500).json({ error: 'Failed to submit report', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get all reports (admin only)
router.get('/', isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const query = `
      SELECT 
        r.*,
        u.first_name as reporter_firstName,
        u.last_name as reporter_lastName,
        u.email as reporter_email,
        p.content as post_content,
        p.created_at as post_created_at,
        author.first_name as author_firstName,
        author.last_name as author_lastName,
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
router.patch('/:reportId/status', isAuthenticated, isAdmin, async (req: any, res) => {
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

// Delete reported post (admin only)
router.delete('/posts/:postId', isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const postId = parseInt(req.params.postId);
    const db = (req as any).db || require('../db').sqlite;

    // Check if post exists
    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Delete related data first (foreign key constraints)
    db.prepare('DELETE FROM comments WHERE post_id = ?').run(postId);
    db.prepare('DELETE FROM likes WHERE post_id = ?').run(postId);
    db.prepare('DELETE FROM reposts WHERE post_id = ?').run(postId);
    db.prepare('DELETE FROM saved_posts WHERE post_id = ?').run(postId);
    db.prepare('DELETE FROM reports WHERE post_id = ?').run(postId);
    
    // Finally delete the post
    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);

    res.json({ success: true, message: 'Post deleted successfully' });

  } catch (error) {
    console.error('Delete reported post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Report an account
router.post('/accounts/:userId', isAuthenticated, async (req: any, res) => {
  try {
    console.log('🚨 Account report submission started');
    console.log('📝 Request params:', req.params);
    console.log('📝 Request body:', req.body);
    console.log('📝 Reporter ID:', req.userId);
    
    const reportedUserId = parseInt(req.params.userId);
    const { reason, description } = req.body;
    const reporterId = req.userId;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    // Check if reported user exists
    const db = (req as any).db || require('../db').sqlite;
    const reportedUser = db.prepare('SELECT id, first_name, last_name, email FROM users WHERE id = ?').get(reportedUserId);
    
    if (!reportedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent self-reporting
    if (reportedUserId === reporterId) {
      return res.status(400).json({ error: 'You cannot report yourself' });
    }

    // Check if user already reported this account
    const existingReport = db.prepare(`
      SELECT id FROM account_reports 
      WHERE reported_user_id = ? AND reporter_id = ? AND status = 'pending'
    `).get(reportedUserId, reporterId);

    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this account' });
    }

    // Insert account report into database
    const insertReport = `
      INSERT INTO account_reports (reported_user_id, reporter_id, reason, description, created_at, status)
      VALUES (?, ?, ?, ?, datetime('now'), 'pending')
    `;
    
    console.log('📝 Inserting account report into database:', { reportedUserId, reporterId, reason, description });
    db.prepare(insertReport).run(reportedUserId, reporterId, reason, description || '');
    console.log('✅ Account report saved to database successfully');

    res.json({ 
      success: true, 
      message: 'Account report submitted successfully. Our team will review it shortly.' 
    });

  } catch (error) {
    console.error('❌ Account report submission error:', error);
    res.status(500).json({ error: 'Failed to submit account report', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Get all account reports (admin only)
router.get('/accounts', isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const { status } = req.query;
    const db = (req as any).db || require('../db').sqlite;
    
    let query = `
      SELECT 
        ar.*,
        reporter.first_name as reporter_firstName,
        reporter.last_name as reporter_lastName,
        reporter.email as reporter_email,
        reported.first_name as reported_firstName,
        reported.last_name as reported_lastName,
        reported.email as reported_email,
        reported.profile_image_url as reported_profileImageUrl
      FROM account_reports ar
      JOIN users reporter ON ar.reporter_id = reporter.id
      JOIN users reported ON ar.reported_user_id = reported.id
    `;
    
    const params: any[] = [];
    if (status && status !== 'all') {
      query += ' WHERE ar.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY ar.created_at DESC';
    
    const reports = db.prepare(query).all(...params);
    res.json(reports);
  } catch (error) {
    console.error('Get account reports error:', error);
    res.status(500).json({ error: 'Failed to fetch account reports' });
  }
});

// Update account report status (admin only)
router.patch('/accounts/:reportId/status', isAuthenticated, isAdmin, async (req: any, res) => {
  try {
    const reportId = parseInt(req.params.reportId);
    const { status, admin_notes } = req.body;

    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateQuery = `
      UPDATE account_reports 
      SET status = ?, admin_notes = ?, reviewed_at = datetime('now'), reviewed_by = ?
      WHERE id = ?
    `;

    const userId = req.userId;
    const db = (req as any).db || require('../db').sqlite;
    db.prepare(updateQuery).run(status, admin_notes || '', userId, reportId);

    res.json({ success: true, message: 'Account report status updated' });

  } catch (error) {
    console.error('Update account report status error:', error);
    res.status(500).json({ error: 'Failed to update account report status' });
  }
});

export default router;
