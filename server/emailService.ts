import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Delay transporter creation to ensure env vars are loaded
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Use environment variables for email configuration
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || '',
      },
    };

    console.log('Email service initialization:', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      hasUser: !!emailConfig.auth.user,
      hasPass: !!emailConfig.auth.pass,
    });

    // Only create transporter if credentials are available
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
      console.log('Email transporter created successfully');
    } else {
      console.warn('Email credentials not configured. Email functionality will be disabled.');
      this.transporter = null as any;
    }
  }

  async sendOtpEmail(email: string, otp: string, firstName?: string): Promise<boolean> {
    try {
      // Check if transporter is available
      if (!this.transporter) {
        console.error('Email transporter not initialized - missing SMTP credentials');
        return false;
      }

      console.log('Attempting to send OTP email to:', email);
      console.log('SMTP Config:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER ? '***configured***' : 'missing',
        pass: process.env.SMTP_PASS ? '***configured***' : 'missing'
      });

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@entreefox.com',
        to: email,
        subject: 'EntreeFox - Password Reset OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #000; text-align: center;">EntreeFox</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h3>Password Reset Request</h3>
              ${firstName ? `<p>Hi ${firstName},</p>` : '<p>Hi,</p>'}
              <p>You requested to reset your password. Use the following OTP to proceed:</p>
              <div style="text-align: center; margin: 20px 0;">
                <span style="background-color: #000; color: #fff; padding: 15px 30px; font-size: 24px; font-weight: bold; border-radius: 8px; letter-spacing: 5px;">${otp}</span>
              </div>
              <p>This OTP will expire in 10 minutes.</p>
              <p>If you didn't request this password reset, please ignore this email.</p>
            </div>
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
              This email was sent by EntreeFox - Your Community Marketplace
            </p>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending OTP email:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        command: error.command
      });
      return false;
    }
  }

  async sendPasswordChangeNotification(email: string, firstName?: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@entreefox.com',
        to: email,
        subject: 'EntreeFox - Password Changed Successfully',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #000; text-align: center;">EntreeFox</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h3>Password Changed Successfully</h3>
              ${firstName ? `<p>Hi ${firstName},</p>` : '<p>Hi,</p>'}
              <p>Your password has been successfully changed.</p>
              <p>If you didn't make this change, please contact our support team immediately.</p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.APP_URL || 'http://localhost:5000'}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Sign In to Your Account</a>
              </div>
            </div>
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
              This email was sent by EntreeFox - Your Community Marketplace
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending password change notification:', error);
      return false;
    }
  }

  async sendPasswordEmail(email: string, password: string, firstName?: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@entreefox.com',
        to: email,
        subject: 'Welcome to EntreeFox - Your Account Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #000; text-align: center;">EntreeFox</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h3>Welcome to EntreeFox!</h3>
              ${firstName ? `<p>Hi ${firstName},</p>` : '<p>Hi,</p>'}
              <p>Your account has been created successfully. Here are your login credentials:</p>
              <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> <span style="background-color: #000; color: #fff; padding: 5px 10px; border-radius: 3px; font-family: monospace;">${password}</span></p>
              </div>
              <p>Please keep this password safe and consider changing it after your first login.</p>
              <p>You can now login to your EntreeFox account and start connecting with vendors and customers!</p>
            </div>
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
              This email was sent by EntreeFox - Your Community Marketplace
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending password email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, firstName?: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@entreefox.com',
        to: email,
        subject: 'Welcome to EntreeFox!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #000; text-align: center;">Welcome to EntreeFox!</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              ${firstName ? `<p>Hi ${firstName},</p>` : '<p>Hi,</p>'}
              <p>Welcome to EntreeFox - your community marketplace!</p>
              <p>You can now:</p>
              <ul>
                <li>Connect with vendors and customers</li>
                <li>Share updates and experiences</li>
                <li>Discover what's happening in your community</li>
                <li>Access the marketplace and start trading!</li>
              </ul>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.APP_URL || 'http://localhost:5000'}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Get Started</a>
              </div>
            </div>
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
              This email was sent by EntreeFox - Your Community Marketplace
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();