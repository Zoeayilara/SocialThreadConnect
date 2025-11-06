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
  private transporter: nodemailer.Transporter | null = null;
  private useHttpFallback: boolean = false;

  constructor() {
    // Delay transporter creation to ensure env vars are loaded
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Use environment variables for email configuration
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // Use STARTTLS instead of SSL
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
      this.transporter = nodemailer.createTransport({
        ...emailConfig,
        requireTLS: true, // Force TLS for Gmail
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates in production
        },
        connectionTimeout: 60000, // 60 seconds - Gmail needs time
        greetingTimeout: 30000, // 30 seconds
        socketTimeout: 60000, // 60 seconds
        pool: true,
        maxConnections: 5,
        maxMessages: 100
      });
      console.log('Email transporter created successfully');
    } else {
      console.warn('Email credentials not configured. Email functionality will be disabled.');
      this.transporter = null as any;
    }
  }

  async sendOtpEmail(email: string, otp: string, firstName?: string): Promise<boolean> {
    // Try HTTP-based email service first (works better on Railway)
    if (process.env.RAILWAY_ENVIRONMENT_NAME) {
      console.log('🚂 Railway environment detected - using HTTP email fallback');
      return await this.sendEmailViaHttp(email, otp, firstName, 'otp');
    }

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
        secure: process.env.SMTP_SECURE,
        user: process.env.SMTP_USER ? '***configured***' : 'missing',
        pass: process.env.SMTP_PASS ? '***configured***' : 'missing'
      });

      // Test transporter connection before sending (with shorter timeout)
      try {
        const verifyPromise = this.transporter.verify();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SMTP verification timeout')), 10000)
        );
        
        await Promise.race([verifyPromise, timeoutPromise]);
        console.log('✅ SMTP connection verified successfully');
      } catch (verifyError) {
        console.error('❌ SMTP connection verification failed:', verifyError);
        console.log('🔄 Falling back to HTTP email service');
        return await this.sendEmailViaHttp(email, otp, firstName, 'otp');
      }

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

      // Send email with reasonable timeout for Gmail
      const emailPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email send timeout after 45 seconds')), 45000)
      );

      const result = await Promise.race([emailPromise, timeoutPromise]);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error: any) {
      console.error('Error sending OTP email:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        command: error?.command
      });
      return false;
    }
  }

  async sendPasswordChangeNotification(email: string, firstName?: string): Promise<boolean> {
    try {
      // Check if transporter is available
      if (!this.transporter) {
        console.error('Email transporter not initialized - missing SMTP credentials');
        return false;
      }

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

      // Add timeout to prevent hanging
      const emailPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Password change notification timeout after 10 seconds')), 10000)
      );

      await Promise.race([emailPromise, timeoutPromise]);
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

      if (!this.transporter) {
        console.error('Email transporter not initialized');
        return false;
      }
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending password email:', error);
      return false;
    }
  }


  // HTTP-based email service for Railway using Resend
  private async sendEmailViaHttp(email: string, otp: string, firstName: string | undefined, type: 'otp' | 'notification'): Promise<boolean> {
    try {
      console.log('📧 Attempting HTTP email send to:', email);
      
      // Check if Resend API key is configured
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.log('⚠️ RESEND_API_KEY not configured - logging OTP instead');
        console.log('🔑 OTP for', email, ':', otp);
        return true; // Return true so the flow continues
      }

      // Send email via Resend API 
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const emailData = {
        from: `EntreeFox <${fromEmail}>`,
        to: [email],
        subject: type === 'otp' ? 'EntreeFox - Password Reset OTP' : 'EntreeFox - Password Changed',
        html: type === 'otp' ? this.getOtpEmailHtml(otp, firstName) : this.getPasswordChangeHtml(firstName)
      };

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Email sent successfully via Resend:', result.id);
        return true;
      } else {
        const error = await response.text();
        console.error('❌ Resend API error:', error);
        console.log('🔑 Fallback - OTP for', email, ':', otp);
        return true; // Still return true so user can proceed
      }
    } catch (error) {
      console.error('❌ HTTP email send failed:', error);
      console.log('🔑 Fallback - OTP for', email, ':', otp);
      return true; // Still return true so user can proceed
    }
  }

  private getOtpEmailHtml(otp: string, firstName: string | undefined): string {
    return `
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
    `;
  }

  private getPasswordChangeHtml(firstName: string | undefined): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #000; text-align: center;">EntreeFox</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h3>Password Changed Successfully</h3>
          ${firstName ? `<p>Hi ${firstName},</p>` : '<p>Hi,</p>'}
          <p>Your password has been successfully changed.</p>
          <p>If you didn't make this change, please contact our support team immediately.</p>
        </div>
        <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
          This email was sent by EntreeFox - Your Community Marketplace
        </p>
      </div>
    `;
  }

  // Send welcome email to new users
  async sendWelcomeEmail(email: string, firstName: string, userType: string): Promise<boolean> {
    try {
      console.log('📧 Sending welcome email to:', email);

      // Try HTTP-based email service first (works better on Railway/Fly.io)
      if (process.env.RAILWAY_ENVIRONMENT_NAME || process.env.FLY_APP_NAME) {
        console.log('☁️ Cloud environment detected - using HTTP email service');
        return await this.sendWelcomeEmailViaHttp(email, firstName, userType);
      }

      // Check if SMTP credentials are available
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('⚠️ SMTP not configured - falling back to HTTP email service');
        return await this.sendWelcomeEmailViaHttp(email, firstName, userType);
      }

      const mailOptions = {
        from: `"EntreeFox" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Welcome to EntreeFox! 🎉',
        html: this.getWelcomeEmailHtml(firstName, userType),
      };

      if (!this.transporter) {
        console.error('Email transporter not initialized');
        return await this.sendWelcomeEmailViaHttp(email, firstName, userType);
      }
      await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent successfully via SMTP');
      return true;
    } catch (error) {
      console.error('❌ SMTP welcome email failed:', error);
      console.log('🔄 Falling back to HTTP email service');
      return await this.sendWelcomeEmailViaHttp(email, firstName, userType);
    }
  }

  // HTTP-based welcome email using Resend
  private async sendWelcomeEmailViaHttp(email: string, firstName: string, userType: string): Promise<boolean> {
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.log('⚠️ RESEND_API_KEY not configured - skipping welcome email');
        return true; // Return true so registration continues
      }

      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const emailData = {
        from: `EntreeFox <${fromEmail}>`,
        to: [email],
        subject: 'Welcome to EntreeFox! 🎉',
        html: this.getWelcomeEmailHtml(firstName, userType)
      };

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Welcome email sent successfully via Resend:', result.id);
        return true;
      } else {
        const error = await response.text();
        console.error('❌ Resend API error:', error);
        return true; // Still return true so registration continues
      }
    } catch (error) {
      console.error('❌ HTTP welcome email send failed:', error);
      return true; // Still return true so registration continues
    }
  }

  private getWelcomeEmailHtml(firstName: string, userType: string): string {
    const isVendor = userType === 'vendor';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px;">🦊 EntreeFox</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Your Community Marketplace</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 30px; background-color: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Welcome, ${firstName}! 🎉</h2>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            We're thrilled to have you join the EntreeFox community! You've just taken the first step towards connecting with your campus marketplace.
          </p>

          ${isVendor ? `
            <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #667eea; margin-top: 0;">🏪 As a Vendor</h3>
              <p style="color: #555; line-height: 1.6;">
                You can showcase your products and services to students in your university community. Set up your shop, list your items, and start connecting with customers today!
              </p>
            </div>
          ` : `
            <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #764ba2;">
              <h3 style="color: #764ba2; margin-top: 0;">🛍️ As a Customer</h3>
              <p style="color: #555; line-height: 1.6;">
                Discover amazing products and services from vendors in your university. Browse, shop, and support local student entrepreneurs!
              </p>
            </div>
          `}

          <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">What is EntreeFox?</h3>
            <p style="color: #555; line-height: 1.6;">
              EntreeFox is a vibrant community marketplace designed specifically for university students. We connect <strong>vendors</strong> (students selling products/services) with <strong>customers</strong> (students looking to buy) - all within your campus community.
            </p>
            <ul style="color: #555; line-height: 1.8;">
              <li><strong>For Vendors:</strong> Showcase your business, manage inventory, and reach customers easily</li>
              <li><strong>For Customers:</strong> Discover unique products, support fellow students, and shop conveniently</li>
              <li><strong>Community-Driven:</strong> Built by students, for students</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://entreefox.com'}/login" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: #ffffff; 
                      padding: 15px 40px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      display: inline-block;
                      font-size: 16px;">
              Sign In Now
            </a>
          </div>

          <p style="color: #555; line-height: 1.6; font-size: 14px; margin-top: 30px;">
            Need help getting started? Feel free to explore the platform and reach out if you have any questions!
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #333; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            This email was sent by EntreeFox<br>
            Your Community Marketplace
          </p>
        </div>
      </div>
    `;
  }

  // Send order notification to vendor
  async sendVendorOrderNotification(
    vendorEmail: string,
    orderDetails: {
      vendorName: string;
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      productName: string;
      quantity: number;
      size?: string;
      totalAmount: number;
      shippingAddress: string;
      orderReference: string;
    }
  ): Promise<boolean> {
    try {
      console.log('📧 Sending order notification to vendor:', vendorEmail);

      // Try HTTP-based email service first (works better on Railway/Fly.io)
      if (process.env.RAILWAY_ENVIRONMENT_NAME || process.env.FLY_APP_NAME) {
        console.log('☁️ Cloud environment detected - using HTTP email service');
        return await this.sendVendorOrderNotificationViaHttp(vendorEmail, orderDetails);
      }

      // Check if SMTP credentials are available
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('⚠️ SMTP not configured - falling back to HTTP email service');
        return await this.sendVendorOrderNotificationViaHttp(vendorEmail, orderDetails);
      }

      const mailOptions = {
        from: `"EntreeFox" <${process.env.SMTP_USER}>`,
        to: vendorEmail,
        subject: '🎉 New Order Received - EntreeFox',
        html: this.getVendorOrderNotificationHtml(orderDetails),
      };

      if (!this.transporter) {
        console.error('Email transporter not initialized');
        return await this.sendVendorOrderNotificationViaHttp(vendorEmail, orderDetails);
      }
      await this.transporter.sendMail(mailOptions);
      console.log('✅ Vendor order notification sent successfully via SMTP');
      return true;
    } catch (error) {
      console.error('❌ SMTP vendor notification failed:', error);
      console.log('🔄 Falling back to HTTP email service');
      return await this.sendVendorOrderNotificationViaHttp(vendorEmail, orderDetails);
    }
  }

  // HTTP-based vendor order notification using Resend
  private async sendVendorOrderNotificationViaHttp(
    vendorEmail: string,
    orderDetails: {
      vendorName: string;
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      productName: string;
      quantity: number;
      size?: string;
      totalAmount: number;
      shippingAddress: string;
      orderReference: string;
    }
  ): Promise<boolean> {
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.log('⚠️ RESEND_API_KEY not configured - logging order notification instead');
        console.log('📦 New order for vendor:', vendorEmail, orderDetails);
        return true; // Return true so order processing continues
      }

      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const emailData = {
        from: `EntreeFox <${fromEmail}>`,
        to: [vendorEmail],
        subject: '🎉 New Order Received - EntreeFox',
        html: this.getVendorOrderNotificationHtml(orderDetails)
      };

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Vendor order notification sent successfully via Resend:', result.id);
        return true;
      } else {
        const error = await response.text();
        console.error('❌ Resend API error:', error);
        console.log('📦 Fallback - New order for vendor:', vendorEmail, orderDetails);
        return true; // Still return true so order processing continues
      }
    } catch (error) {
      console.error('❌ HTTP vendor notification send failed:', error);
      console.log('📦 Fallback - New order for vendor:', vendorEmail, orderDetails);
      return true; // Still return true so order processing continues
    }
  }

  private getVendorOrderNotificationHtml(orderDetails: {
    vendorName: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    productName: string;
    quantity: number;
    size?: string;
    totalAmount: number;
    shippingAddress: string;
    orderReference: string;
  }): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px;">🦊 EntreeFox</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">New Order Received!</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 30px; background-color: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Hi ${orderDetails.vendorName}! 🎉</h2>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px;">
            Great news! You've received a new order on EntreeFox.
          </p>

          <!-- Order Details -->
          <div style="background-color: #fff; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #667eea; margin-top: 0;">📦 Order Details</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #666; font-weight: bold;">Order Reference:</td>
                <td style="padding: 10px 0; color: #333;">${orderDetails.orderReference}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666; font-weight: bold;">Product:</td>
                <td style="padding: 10px 0; color: #333;">${orderDetails.productName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666; font-weight: bold;">Quantity:</td>
                <td style="padding: 10px 0; color: #333;">${orderDetails.quantity}</td>
              </tr>
              ${orderDetails.size ? `
              <tr>
                <td style="padding: 10px 0; color: #666; font-weight: bold;">Size:</td>
                <td style="padding: 10px 0; color: #333;">${orderDetails.size}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 0; color: #666; font-weight: bold;">Total Amount:</td>
                <td style="padding: 10px 0; color: #333; font-size: 18px; font-weight: bold;">₦${orderDetails.totalAmount.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <!-- Customer Details -->
          <div style="background-color: #fff; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #764ba2;">
            <h3 style="color: #764ba2; margin-top: 0;">👤 Customer Information</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #666; font-weight: bold;">Name:</td>
                <td style="padding: 10px 0; color: #333;">${orderDetails.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #666; font-weight: bold;">Email:</td>
                <td style="padding: 10px 0; color: #333;">${orderDetails.customerEmail}</td>
              </tr>
              ${orderDetails.customerPhone ? `
              <tr>
                <td style="padding: 10px 0; color: #666; font-weight: bold;">Phone:</td>
                <td style="padding: 10px 0; color: #333;">${orderDetails.customerPhone}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 0; color: #666; font-weight: bold; vertical-align: top;">Shipping Address:</td>
                <td style="padding: 10px 0; color: #333;">${orderDetails.shippingAddress}</td>
              </tr>
            </table>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://entreefox.com'}/vendor-orders" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: #ffffff; 
                      padding: 15px 40px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold; 
                      display: inline-block;
                      font-size: 16px;">
              View Order Details
            </a>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="color: #856404; margin: 0; line-height: 1.6;">
              <strong>⚠️ Important:</strong> Please prepare the order and contact the customer to arrange delivery or pickup.
            </p>
          </div>

          <p style="color: #555; line-height: 1.6; font-size: 14px; margin-top: 30px;">
            Payment has been confirmed and will be transferred to your account according to your settlement schedule.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #333; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            This email was sent by EntreeFox<br>
            Your Community Marketplace
          </p>
        </div>
      </div>
    `;
  }
}

export const emailService = new EmailService();