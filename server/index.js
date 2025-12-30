const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============================================
// EMAIL CONFIGURATION (SendGrid HTTP API)
// ============================================
// SendGrid free tier: 100 emails/day - can send to ANY email!
// Get API key at: https://sendgrid.com → Settings → API Keys

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'bhavya.oberoi@learnapp.co';

// Resend fallback (for when SendGrid not configured)
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_gPwuFNvg_JEL3arzPU7QApcCZz7CW5xFu';

console.log('📧 Email Configuration:');
console.log('   Primary: SendGrid HTTP API (can send to ANY email)');
console.log('   Fallback: Resend API');
console.log('   From:', EMAIL_FROM);
console.log('   SendGrid:', SENDGRID_API_KEY ? '✅ Configured' : '⚠️ Not configured - set SENDGRID_API_KEY');

// Generate a unique Message-ID for email threading
function generateMessageId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}.${random}@learnapp.co`;
}

// Send email via SendGrid HTTP API (with Resend fallback)
async function sendEmailViaSMTP(to, subject, html, threadOptions = {}) {
  let messageId = '';
  
  if (threadOptions.threadId) {
    console.log('📧 Threading reply to:', threadOptions.threadId);
  } else {
    messageId = generateMessageId();
    threadOptions._generatedMessageId = messageId;
    console.log('📧 Creating new thread with Message-ID:', messageId);
  }

  // Try SendGrid HTTP API first (can send to ANY email!)
  if (SENDGRID_API_KEY) {
    try {
      const emailPayload = {
        personalizations: [{
          to: [{ email: to }]
        }],
        from: { email: EMAIL_FROM, name: 'ShootFlow' },
        subject: subject,
        content: [{ type: 'text/html', value: html }]
      };

      // Add threading headers
      if (threadOptions.threadId || messageId) {
        emailPayload.headers = {};
        if (threadOptions.threadId) {
          emailPayload.headers['In-Reply-To'] = `<${threadOptions.threadId}>`;
          emailPayload.headers['References'] = `<${threadOptions.threadId}>`;
        } else if (messageId) {
          emailPayload.headers['Message-ID'] = `<${messageId}>`;
        }
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
      }

      const returnMessageId = threadOptions._generatedMessageId || messageId;
      console.log('✅ Email sent via SendGrid:', returnMessageId, '| To:', to);
      return { messageId: returnMessageId, method: 'sendgrid' };
      
    } catch (sendgridError) {
      console.log('⚠️ SendGrid failed:', sendgridError.message);
      console.log('   Falling back to Resend API...');
    }
  } else {
    console.log('⚠️ SendGrid not configured, using Resend...');
  }
  
  // Fallback to Resend HTTP API
  try {
    // For Resend free tier: send to verified email with intended recipient info
    const VERIFIED_EMAIL = 'bhavya.oberoi@learnapp.co';
    
    // Add a banner showing the intended recipient (for free tier limitation)
    const emailWithBanner = `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px 20px; margin-bottom: 20px; border-radius: 8px;">
        <p style="margin: 0; color: white; font-size: 14px;">
          <strong>📧 INTENDED RECIPIENT:</strong> ${to}
        </p>
        <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.8); font-size: 12px;">
          Configure SendGrid to send directly to this email.
        </p>
      </div>
      ${html}
    `;
    
    const emailPayload = {
      from: 'ShootFlow <onboarding@resend.dev>',
      to: VERIFIED_EMAIL,
      subject: `[For: ${to}] ${subject}`,
      html: emailWithBanner
    };

    if (threadOptions.threadId) {
      emailPayload.headers = { 'In-Reply-To': `<${threadOptions.threadId}>`, 'References': `<${threadOptions.threadId}>` };
    } else if (messageId) {
      emailPayload.headers = { 'Message-ID': `<${messageId}>` };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Resend API error');
    
    console.log('✅ Email sent via Resend (fallback):', data.id, '| For:', to, '| Delivered to:', VERIFIED_EMAIL);
    return { messageId: threadOptions._generatedMessageId || data.id, resendId: data.id, method: 'resend' };
    
  } catch (resendError) {
    console.error('❌ All email methods failed:', resendError.message);
    throw new Error(`Email send failed: ${resendError.message}`);
  }
}

console.log('✅ Email service initialized');

// Helper function to format equipment list with owner and price
const formatEquipmentList = (equipment) => {
  if (!equipment || equipment.length === 0) return '<p style="color: #666;">No equipment listed</p>';
  
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
      <thead>
        <tr style="background: #f8f9fa;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6; color: #333;">Item</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6; color: #333;">Qty</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6; color: #333;">Rate/Day</th>
        </tr>
      </thead>
      <tbody>
        ${equipment.map(eq => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #333;">${eq.name || eq.itemName || '-'}</td>
            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee; color: #666;">${eq.quantity || eq.qty || 1}</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee; color: #333;">₹${(eq.dailyRate || eq.rate || eq.expectedRate || 0).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

// Calculate total budget from equipment
const calculateBudget = (equipment) => {
  if (!equipment || equipment.length === 0) return 0;
  return equipment.reduce((total, eq) => {
    const qty = eq.quantity || eq.qty || 1;
    const rate = eq.dailyRate || eq.rate || eq.expectedRate || 0;
    return total + (qty * rate);
  }, 0);
};

// Email templates
const emailTemplates = {
  // 1. New shoot request created (SINGLE SHOOT) - notify approver
  newRequest: (shoot) => {
    const recipientName = shoot.recipientName || 'Team';
    const equipment = shoot.equipment || [];
    const totalItems = equipment.length;
    const estimatedBudget = calculateBudget(equipment);
    const appUrl = process.env.APP_URL || 'https://pre-production-poc.up.railway.app';
    
    return {
      subject: `🔔 ACTION REQUIRED: New Shoot Request - ${shoot.name}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px; margin-top: 0;">Hi ${recipientName},</p>
            <p style="color: #666; line-height: 1.6;">The Pre-Production team has submitted a new equipment requirement.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">📋 SHOOT DETAILS</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #666; width: 140px;">Shoot Name:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${shoot.name}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Dates:</td><td style="padding: 8px 0; color: #333;">${shoot.date || shoot.dates || 'TBD'}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Requested By:</td><td style="padding: 8px 0; color: #333;">${shoot.requestor?.name || 'Pre-Production Team'}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Total Items:</td><td style="padding: 8px 0; color: #333;">${totalItems}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Estimated Budget:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">₹${estimatedBudget.toLocaleString()}</td></tr>
              </table>
            </div>
            
            <div style="margin: 25px 0;">
              <h3 style="color: #333; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">📦 EQUIPMENT LIST</h3>
              ${formatEquipmentList(equipment)}
            </div>
            
            <div style="background: #fff3cd; padding: 15px 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
              <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 14px;">📋 NEXT STEP</h4>
              <p style="color: #856404; margin: 0;">Please review the list and forward it to Gopala Media for a final quote.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}" 
                 style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; margin: 5px;">
                Review & Send to Vendor →
              </a>
              <br><br>
              <span style="color: #666; font-size: 13px;">Or copy this link: </span>
              <code style="background: #f0f0f0; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #333; word-break: break-all;">${appUrl}</code>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-top: 30px;">Best regards,<br><strong>Pre-Production Team</strong></p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated message from ShootFlow. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      `
    };
  },

  // 1b. New shoot request created (MULTI SHOOT - 2 shoots) - notify approver
  newRequestMulti: (data) => {
    const recipientName = data.recipientName || 'Team';
    const shoot1 = data.shoots?.[0] || data.shoot1 || {};
    const shoot2 = data.shoots?.[1] || data.shoot2 || {};
    const allEquipment = [...(shoot1.equipment || []), ...(shoot2.equipment || [])];
    const totalItems = allEquipment.length;
    const estimatedBudget = calculateBudget(allEquipment);
    const requestedBy = shoot1.requestor?.name || data.requestorName || 'Pre-Production Team';
    const shootDates = shoot1.date || shoot1.dates || 'TBD';
    const appUrl = process.env.APP_URL || 'https://pre-production-poc.up.railway.app';
    
    return {
      subject: `🔔 ACTION REQUIRED: New Equipment Request - ${data.shoots?.length || 2} Shoots Request`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px; margin-top: 0;">Hi ${recipientName},</p>
            <p style="color: #666; line-height: 1.6;">The Pre-Production team has submitted a new equipment requirement for <strong>two shoots</strong>.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">📋 SHOOT DETAILS</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr><td style="padding: 8px 0; color: #666; width: 160px;">Shoot Name:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${data.shoots?.length || 2} Shoots Request</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Dates:</td><td style="padding: 8px 0; color: #333;">${shootDates}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Requested By:</td><td style="padding: 8px 0; color: #333; text-transform: uppercase;">${requestedBy}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Total Items:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${totalItems}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Estimated Budget:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">₹${estimatedBudget.toLocaleString()}</td></tr>
              </table>
            </div>
            
            <div style="margin: 25px 0;">
              <h3 style="color: #333; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">📦 EQUIPMENT LIST</h3>
              
              ${shoot1.equipment && shoot1.equipment.length > 0 ? `
                <h4 style="color: #667eea; margin: 20px 0 10px 0;">Shoot 1 (${shoot1.name || 'Shoot 1'}) Equipment</h4>
                ${formatEquipmentList(shoot1.equipment)}
              ` : ''}
              
              ${shoot2.equipment && shoot2.equipment.length > 0 ? `
                <h4 style="color: #667eea; margin: 20px 0 10px 0;">Shoot 2 (${shoot2.name || 'Shoot 2'}) Equipment</h4>
                ${formatEquipmentList(shoot2.equipment)}
              ` : ''}
            </div>
            
            <div style="background: #fff3cd; padding: 15px 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
              <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 14px;">📋 NEXT STEP</h4>
              <p style="color: #856404; margin: 0;">Please review the list and forward it to Gopala Media for a final quote.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}" 
                 style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; margin: 5px;">
                Review & Send to Vendor →
              </a>
              <br><br>
              <span style="color: #666; font-size: 13px;">Or copy this link: </span>
              <code style="background: #f0f0f0; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #333; word-break: break-all;">${appUrl}</code>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-top: 30px;">Best regards,<br><strong>Pre-Production Team</strong></p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated message from ShootFlow. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      `
    };
  },

  // 2. Vendor submits quote - notify approver (Gopala Media quote)
  quoteSubmitted: (shoot) => {
    const recipientName = shoot.recipientName || 'Team';
    const equipment = shoot.equipment || [];
    const vendorTotal = shoot.vendorQuote?.amount || 0;
    const appUrl = process.env.APP_URL || 'https://pre-production-poc.up.railway.app';
    
    // Format equipment list for quote email
    const formatQuoteEquipment = (equipment) => {
      if (!equipment || equipment.length === 0) return '<p style="color: #666;">No equipment listed</p>';
      
      return equipment.map(eq => {
        const price = eq.vendorRate || eq.dailyRate || eq.rate || 0;
        const qty = eq.quantity || eq.qty || 1;
        const total = price * qty;
        return `<div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
          <span style="color: #333;">${eq.name || eq.itemName || '-'}</span>
          <span style="color: #333; font-weight: 600;">₹${total.toLocaleString()}</span>
        </div>`;
      }).join('');
    };
    
    return {
      subject: `✅ Quote Received: ${shoot.name} - ₹${vendorTotal.toLocaleString()}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px; margin-top: 0;">Hi ${recipientName},</p>
            <p style="color: #666; line-height: 1.6;">Gopala Media has submitted the final quote for the shoot.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #333; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">💰 QUOTE SUMMARY</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #666; width: 140px;">Shoot:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${shoot.name}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Dates:</td><td style="padding: 8px 0; color: #333;">${shoot.date || shoot.dates || 'TBD'}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Vendor Total:</td><td style="padding: 8px 0; color: #28a745; font-weight: 700; font-size: 18px;">₹${vendorTotal.toLocaleString()}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Status:</td><td style="padding: 8px 0;"><span style="background: #d4edda; color: #155724; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Quote Received</span></td></tr>
              </table>
            </div>
            
            <div style="margin: 25px 0;">
              <h3 style="color: #333; margin-bottom: 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">📦 EQUIPMENT LIST</h3>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                ${formatQuoteEquipment(equipment)}
              </div>
            </div>
            
            <div style="background: #fff3cd; padding: 15px 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
              <p style="color: #856404; margin: 0;">Please review the pricing. If everything looks correct, you can forward this to Swati for final financial approval.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}" 
                 style="background: #28a745; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; margin-right: 10px;">
                Review & Send for Approval →
              </a>
              <button 
                onclick="navigator.clipboard.writeText('${appUrl}'); alert('Link copied!');"
                style="background: #f0f0f0; color: #333; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; cursor: pointer; border: 1px solid #ccc;">
                Copy Link
              </button>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-top: 30px;">Best regards,<br><strong>Pre-Production Team</strong></p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated message from ShootFlow. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      `
    };
  },

  // 3. Quote approved - notify requestor & vendor
  quoteApproved: (shoot) => {
    const recipientName = shoot.recipientName || 'Team';
    const approvedAmount = shoot.approvedAmount || shoot.vendorQuote?.amount || 0;
    const approvedBy = shoot.approvedBy || 'Swati';
    const vendorName = shoot.vendorName || 'Gopala Media';
    const appUrl = process.env.APP_URL || 'https://pre-production-poc.up.railway.app';
    
    return {
      subject: `✅ Budget Approved: ${shoot.name} - Ready for Shoot`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px; margin-top: 0;">Hi ${recipientName},</p>
            <p style="color: #666; line-height: 1.6;">Good news! The budget for <strong>${shoot.name}</strong> has been approved by <strong>${approvedBy}</strong>.</p>
            
            <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #155724; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">🚀 NEXT STEPS</h3>
              <ul style="color: #155724; margin: 10px 0 0 0; padding-left: 20px; line-height: 1.8;">
                <li>The Purchase Order (PO) has been generated automatically.</li>
                <li>Please confirm the booking with <strong>${vendorName}</strong>.</li>
              </ul>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #333; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">📋 SHOOT SUMMARY</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr><td style="padding: 8px 0; color: #666; width: 140px;">Vendor:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${vendorName}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Approved Amount:</td><td style="padding: 8px 0; color: #28a745; font-weight: 700; font-size: 18px;">₹${approvedAmount.toLocaleString()}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Approved By:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${approvedBy}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Status:</td><td style="padding: 8px 0;"><span style="background: #d4edda; color: #155724; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Ready for Shoot</span></td></tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}" 
                 style="background: #28a745; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; margin-right: 10px;">
                👉 View Final Shoot Details
              </a>
              <button 
                onclick="navigator.clipboard.writeText('${appUrl}'); alert('Link copied!');"
                style="background: #f0f0f0; color: #333; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; cursor: pointer; border: 1px solid #ccc;">
                Copy Link
              </button>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-top: 30px;">Best regards,<br><strong>Pre-Production Team</strong></p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated message from ShootFlow. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      `
    };
  },

  // 4. Quote rejected - notify requestor
  quoteRejected: (shoot) => ({
    subject: `❌ Quote Rejected: ${shoot.name}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎬 ShootFlow</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Quote Rejected</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #dc3545; margin-top: 0;">Quote Not Approved</h2>
          <p style="color: #666; line-height: 1.6;">Unfortunately, the quote for this shoot request has been rejected.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">📋 Request Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666;">Shoot Name:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${shoot.name}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Date:</td><td style="padding: 8px 0; color: #333;">${shoot.date || 'TBD'}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Quoted Amount:</td><td style="padding: 8px 0; color: #333;">₹${(shoot.vendorQuote?.amount || 0).toLocaleString()}</td></tr>
            </table>
          </div>
          
          ${shoot.rejectionReason ? `
          <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <p style="margin: 0; color: #721c24;"><strong>Reason:</strong> ${shoot.rejectionReason}</p>
          </div>
          ` : ''}
          
          <p style="color: #666; line-height: 1.6;">Please review the feedback and consider submitting a revised quote if applicable.</p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            This is an automated message from ShootFlow.
          </p>
        </div>
      </div>
    `
  }),

  // 5. Invoice reminder - 7 days after shoot completed
  invoiceReminder: (shoot) => {
    const recipientName = shoot.recipientName || 'Team';
    const vendorName = shoot.vendorName || 'Gopala Media';
    const appUrl = process.env.APP_URL || 'https://pre-production-poc.up.railway.app';
    
    return {
      subject: `⚠️ Invoice Pending: ${shoot.name} - Action Required`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px; margin-top: 0;">Hi ${recipientName},</p>
            <p style="color: #666; line-height: 1.6;">The shoot <strong>${shoot.name}</strong> was completed <strong>7 days ago</strong>.</p>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
              <h3 style="color: #856404; margin-top: 0; font-size: 14px;">⚠️ ACTION REQUIRED</h3>
              <p style="color: #856404; margin: 10px 0 0 0; line-height: 1.6;">
                We have not yet received the final invoice in the system.
              </p>
              <p style="color: #856404; margin: 10px 0 0 0; line-height: 1.6;">
                Please collect the final bill from <strong>${vendorName}</strong> and upload it to the dashboard to ensure timely payment processing.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}" 
                 style="background: #ffc107; color: #212529; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; margin-right: 10px;">
                👉 Click here to Upload Invoice
              </a>
              <button 
                onclick="navigator.clipboard.writeText('${appUrl}'); alert('Link copied!');"
                style="background: #f0f0f0; color: #333; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; cursor: pointer; border: 1px solid #ccc;">
                Copy Link
              </button>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #666; margin: 0; font-size: 14px;">
                💡 If the shoot dates were extended, please update the timeline in the <strong>Active Shoots</strong> panel.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-top: 30px;">Best regards,<br><strong>Pre-Production Team</strong></p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated message from ShootFlow. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      `
    };
  },

  // 6. Invoice uploaded - notify finance
  invoiceUploaded: (shoot) => {
    const recipientName = shoot.recipientName || 'Team';
    const appUrl = process.env.APP_URL || 'https://pre-production-poc.up.railway.app';
    
    return {
      subject: `📄 Invoice Uploaded: ${shoot.name}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px; margin-top: 0;">Hi ${recipientName},</p>
            <p style="color: #666; line-height: 1.6;">An invoice has been uploaded for the following shoot and is ready for payment processing.</p>
            
            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #007bff; text-align: center;">
              <p style="color: #0056b3; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">PAYMENT AMOUNT</p>
              <p style="color: #004085; margin: 10px 0 0 0; font-size: 36px; font-weight: 700;">₹${(shoot.approvedAmount || shoot.vendorQuote?.amount || 0).toLocaleString()}</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #6c757d;">
              <h3 style="color: #333; margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">📋 DETAILS</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr><td style="padding: 8px 0; color: #666; width: 140px;">Shoot Name:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${shoot.name}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Invoice File:</td><td style="padding: 8px 0; color: #333;">${shoot.invoiceFile?.name || 'Uploaded'}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Shoot Date:</td><td style="padding: 8px 0; color: #333;">${shoot.date || 'TBD'}</td></tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}" 
                 style="background: #007bff; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; margin-right: 10px;">
                View in ShootFlow →
              </a>
              <button 
                onclick="navigator.clipboard.writeText('${appUrl}'); alert('Link copied!');"
                style="background: #f0f0f0; color: #333; padding: 14px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; cursor: pointer; border: 1px solid #ccc;">
                Copy Link
              </button>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-top: 30px;">Best regards,<br><strong>Pre-Production Team</strong></p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated message from ShootFlow. Please do not reply directly to this email.
            </p>
          </div>
        </div>
      `
    };
  },

  // 6. Payment completed - notify vendor
  paymentComplete: (shoot) => ({
    subject: `💵 Payment Completed: ${shoot.name} - ₹${(shoot.approvedAmount || 0).toLocaleString()}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
        <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎬 ShootFlow</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Payment Completed! 💰</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 80px; height: 80px; background: #d4edda; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 40px;">💵</span>
            </div>
            <h2 style="color: #28a745; margin: 0;">Payment Successful!</h2>
          </div>
          
          <p style="color: #666; line-height: 1.6; text-align: center;">The payment for this shoot has been processed successfully.</p>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="color: #155724; margin: 0; font-size: 14px;">AMOUNT PAID</p>
            <p style="color: #28a745; margin: 10px 0 0 0; font-size: 36px; font-weight: 700;">₹${(shoot.approvedAmount || 0).toLocaleString()}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">📋 Payment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666;">Shoot Name:</td><td style="padding: 8px 0; color: #333; font-weight: 600;">${shoot.name}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Invoice:</td><td style="padding: 8px 0; color: #333;">${shoot.invoiceFile?.name || 'N/A'}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Payment Date:</td><td style="padding: 8px 0; color: #333;">${new Date().toLocaleDateString('en-IN')}</td></tr>
            </table>
          </div>
          
          <p style="color: #666; line-height: 1.6; text-align: center;">Thank you for your service! 🙏</p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            This is an automated message from ShootFlow.
          </p>
        </div>
      </div>
    `
  })
};

// Send email function with threading support
// All emails for a shoot will be threaded together in Gmail
async function sendEmail(to, template, shoot, threadMessageId = null) {
  try {
    const emailContent = emailTemplates[template](shoot);
    
    // For Gmail threading: use IDENTICAL subject line for all emails in thread
    // Use threadSubject if provided (for multi-shoot requests), otherwise use shoot name
    // This ensures all emails for a request group have the same subject
    let subjectIdentifier = shoot.threadSubject || shoot.name || 'Shoot Request';
    
    // For multi-shoot requests, use a consistent identifier based on request group
    if (shoot.requestGroupId) {
      // Use the request group ID or first shoot name for consistent threading
      subjectIdentifier = shoot.threadSubject || `Request ${shoot.requestGroupId.substring(0, 8)}`;
    }
    
    const subject = `ShootFlow: ${subjectIdentifier}`;
    
    // Use Gmail SMTP to send email
    const threadOptions = threadMessageId ? { threadId: threadMessageId } : {};
    const info = await sendEmailViaSMTP(to, subject, emailContent.html, threadOptions);
    
    console.log(`✉️ Email sent: ${template} to ${to} - ${info.messageId}${threadMessageId ? ' (threaded)' : ' (new thread)'} | Subject: ${subject}`);
    return { success: true, messageId: info.messageId, subject };
  } catch (error) {
    console.error(`❌ Email failed: ${template} to ${to}`, error.message);
    return { success: false, error: error.message };
  }
}

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shoots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT,
        duration TEXT,
        location TEXT,
        equipment JSONB DEFAULT '[]'::jsonb,
        status TEXT DEFAULT 'new_request',
        requestor JSONB,
        vendor_quote JSONB,
        approved BOOLEAN DEFAULT FALSE,
        approved_amount DECIMAL,
        invoice_file JSONB,
        paid BOOLEAN DEFAULT FALSE,
        rejection_reason TEXT,
        approval_email TEXT,
        cancellation_reason TEXT,
        activities JSONB DEFAULT '[]'::jsonb,
        email_thread_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        shoot_date TIMESTAMP WITH TIME ZONE,
        request_group_id TEXT,
        is_multi_shoot BOOLEAN DEFAULT FALSE,
        multi_shoot_index INTEGER,
        total_shoots_in_request INTEGER
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalog_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        daily_rate DECIMAL NOT NULL,
        category TEXT NOT NULL,
        last_updated TEXT
      )
    `);

    console.log('Database tables initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all shoots
app.get('/api/shoots', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shoots ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching shoots:', error);
    res.status(500).json({ error: 'Failed to fetch shoots' });
  }
});

// Create or update a shoot
app.post('/api/shoots', async (req, res) => {
  try {
    const shoot = req.body;
    console.log('POST /api/shoots - Received:', shoot.id, 'status:', shoot.status);
    const result = await pool.query(`
      INSERT INTO shoots (
        id, name, date, duration, location, equipment, status, requestor,
        vendor_quote, approved, approved_amount, invoice_file, paid,
        rejection_reason, approval_email, cancellation_reason, activities,
        email_thread_id, created_at, shoot_date, request_group_id,
        is_multi_shoot, multi_shoot_index, total_shoots_in_request
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        date = EXCLUDED.date,
        duration = EXCLUDED.duration,
        location = EXCLUDED.location,
        equipment = EXCLUDED.equipment,
        status = EXCLUDED.status,
        requestor = EXCLUDED.requestor,
        vendor_quote = EXCLUDED.vendor_quote,
        approved = EXCLUDED.approved,
        approved_amount = EXCLUDED.approved_amount,
        invoice_file = EXCLUDED.invoice_file,
        paid = EXCLUDED.paid,
        rejection_reason = EXCLUDED.rejection_reason,
        approval_email = EXCLUDED.approval_email,
        cancellation_reason = EXCLUDED.cancellation_reason,
        activities = EXCLUDED.activities,
        email_thread_id = EXCLUDED.email_thread_id,
        shoot_date = EXCLUDED.shoot_date,
        request_group_id = EXCLUDED.request_group_id,
        is_multi_shoot = EXCLUDED.is_multi_shoot,
        multi_shoot_index = EXCLUDED.multi_shoot_index,
        total_shoots_in_request = EXCLUDED.total_shoots_in_request
      RETURNING *
    `, [
      shoot.id,
      shoot.name,
      shoot.date,
      shoot.duration,
      shoot.location,
      JSON.stringify(shoot.equipment || []),
      shoot.status,
      JSON.stringify(shoot.requestor),
      JSON.stringify(shoot.vendor_quote),
      shoot.approved,
      shoot.approved_amount,
      JSON.stringify(shoot.invoice_file),
      shoot.paid,
      shoot.rejection_reason,
      shoot.approval_email,
      shoot.cancellation_reason,
      JSON.stringify(shoot.activities || []),
      shoot.email_thread_id,
      shoot.created_at || new Date().toISOString(),
      shoot.shoot_date,
      shoot.request_group_id,
      shoot.is_multi_shoot,
      shoot.multi_shoot_index,
      shoot.total_shoots_in_request
    ]);
    
    console.log('POST /api/shoots - Saved:', result.rows[0].id, 'status:', result.rows[0].status);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving shoot:', error);
    res.status(500).json({ error: 'Failed to save shoot', details: error.message });
  }
});

// Delete a shoot
app.delete('/api/shoots/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM shoots WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shoot:', error);
    res.status(500).json({ error: 'Failed to delete shoot' });
  }
});

// Get all catalog items
app.get('/api/catalog', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM catalog_items ORDER BY category, name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching catalog:', error);
    res.status(500).json({ error: 'Failed to fetch catalog' });
  }
});

// Create or update catalog item
app.post('/api/catalog', async (req, res) => {
  try {
    const item = req.body;
    const result = await pool.query(`
      INSERT INTO catalog_items (id, name, daily_rate, category, last_updated)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        daily_rate = EXCLUDED.daily_rate,
        category = EXCLUDED.category,
        last_updated = EXCLUDED.last_updated
      RETURNING *
    `, [item.id, item.name, item.daily_rate, item.category, item.last_updated]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving catalog item:', error);
    res.status(500).json({ error: 'Failed to save catalog item' });
  }
});

// Bulk upsert catalog items
app.post('/api/catalog/bulk', async (req, res) => {
  try {
    const items = req.body;
    for (const item of items) {
      await pool.query(`
        INSERT INTO catalog_items (id, name, daily_rate, category, last_updated)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          daily_rate = EXCLUDED.daily_rate,
          category = EXCLUDED.category,
          last_updated = EXCLUDED.last_updated
      `, [item.id, item.name, item.daily_rate, item.category, item.last_updated]);
    }
    res.json({ success: true, count: items.length });
  } catch (error) {
    console.error('Error bulk saving catalog:', error);
    res.status(500).json({ error: 'Failed to save catalog items' });
  }
});

// ============================================
// EMAIL API ENDPOINTS
// ============================================

// Send email endpoint
app.post('/api/email/send', async (req, res) => {
  try {
    const { to, template, shoot, threadMessageId } = req.body;
    
    if (!to || !template || !shoot) {
      return res.status(400).json({ error: 'Missing required fields: to, template, shoot' });
    }
    
    if (!emailTemplates[template]) {
      return res.status(400).json({ error: `Invalid template: ${template}. Valid templates: ${Object.keys(emailTemplates).join(', ')}` });
    }
    
    // Pass threadMessageId for email threading (optional)
    const result = await sendEmail(to, template, shoot, threadMessageId || null);
    
    if (result.success) {
      // Return messageId so frontend can store it for threading
      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Email API error:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// Batch send emails (for multi-recipient scenarios)
app.post('/api/email/batch', async (req, res) => {
  try {
    const { emails } = req.body; // Array of { to, template, shoot }
    
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: 'Missing or invalid emails array' });
    }
    
    const results = await Promise.all(
      emails.map(({ to, template, shoot }) => sendEmail(to, template, shoot))
    );
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    res.json({ 
      success: true, 
      summary: { total: emails.length, successful, failed },
      results 
    });
  } catch (error) {
    console.error('Batch email API error:', error);
    res.status(500).json({ error: 'Failed to send batch emails', details: error.message });
  }
});

// Test complete email thread - sends all 6 steps in sequence
app.post('/api/email/test-thread', async (req, res) => {
  try {
    const to = req.body.to || 'bhavya.oberoi@learnapp.co';
    const testShoot = {
      id: 'thread-test-' + Date.now(),
      name: 'Equipment for Brand Video Shoot',
      date: new Date().toLocaleDateString('en-IN'),
      location: 'Mumbai Studio',
      duration: '2 days',
      equipment: [
        { name: 'Camera Sony A7S3', quantity: 2, dailyRate: 1500 },
        { name: 'Sony Lens 24-70mm GM', quantity: 2, dailyRate: 1200 },
        { name: 'Amaran 300c with Softbox', quantity: 3, dailyRate: 1500 },
        { name: 'Sennheiser G4 Lapel Mic', quantity: 4, dailyRate: 500 }
      ],
      requestor: { name: 'Anish Kumar', email: to },
      vendorQuote: { amount: 45000, notes: 'All equipment available' },
      approvedAmount: 45000,
      invoiceFile: { name: 'INV-2025-001.pdf' }
    };

    const results = [];
    let threadId = null;
    
    // Delay between emails (3 seconds) to ensure correct order
    const EMAIL_DELAY = 3000;

    // Step 1: New Request (creates the thread)
    console.log('📧 Sending Step 1/6: New Request...');
    const step1 = await sendEmail(to, 'newRequest', testShoot, null);
    results.push({ step: 1, template: 'newRequest', ...step1 });
    threadId = step1.messageId; // Store for threading

    await new Promise(r => setTimeout(r, EMAIL_DELAY));

    // Step 2: Quote Submitted (threads to step 1)
    console.log('📧 Sending Step 2/6: Quote Submitted...');
    const step2 = await sendEmail(to, 'quoteSubmitted', testShoot, threadId);
    results.push({ step: 2, template: 'quoteSubmitted', ...step2 });

    await new Promise(r => setTimeout(r, EMAIL_DELAY));

    // Step 3: Quote Approved (threads to step 1)
    console.log('📧 Sending Step 3/6: Quote Approved...');
    const step3 = await sendEmail(to, 'quoteApproved', testShoot, threadId);
    results.push({ step: 3, template: 'quoteApproved', ...step3 });

    await new Promise(r => setTimeout(r, EMAIL_DELAY));

    // Step 4: Invoice Reminder (threads to step 1)
    console.log('📧 Sending Step 4/6: Invoice Reminder...');
    const step4 = await sendEmail(to, 'invoiceReminder', testShoot, threadId);
    results.push({ step: 4, template: 'invoiceReminder', ...step4 });

    await new Promise(r => setTimeout(r, EMAIL_DELAY));

    // Step 5: Invoice Uploaded (threads to step 1)
    console.log('📧 Sending Step 5/6: Invoice Uploaded...');
    const step5 = await sendEmail(to, 'invoiceUploaded', testShoot, threadId);
    results.push({ step: 5, template: 'invoiceUploaded', ...step5 });

    await new Promise(r => setTimeout(r, EMAIL_DELAY));

    // Step 6: Payment Complete (threads to step 1)
    console.log('📧 Sending Step 6/6: Payment Complete...');
    const step6 = await sendEmail(to, 'paymentComplete', testShoot, threadId);
    results.push({ step: 6, template: 'paymentComplete', ...step6 });

    res.json({ 
      success: true, 
      message: 'Complete email thread sent! Check your inbox for 6 emails in one thread. Note: Gmail shows newest first - scroll down to see Step 1.',
      threadId,
      results 
    });
  } catch (error) {
    console.error('Thread test error:', error);
    res.status(500).json({ error: 'Failed to send test thread', details: error.message });
  }
});

// Test single email endpoint
app.post('/api/email/test', async (req, res) => {
  try {
    const testShoot = {
      id: 'test-123',
      name: 'Test Shoot',
      date: new Date().toLocaleDateString('en-IN'),
      location: 'Mumbai Studio',
      duration: '1 day',
      equipment: [
        { name: 'Camera Sony A7III', quantity: 1 },
        { name: 'Tripod', quantity: 2 }
      ],
      requestor: { name: 'Test User' },
      vendorQuote: { amount: 25000, notes: 'Test quote' },
      approvedAmount: 25000
    };
    
    const to = req.body.to || process.env.SMTP_USER || 'bhavya.oberoi@learnapp.co';
    const template = req.body.template || 'newRequest';
    
    const result = await sendEmail(to, template, testShoot);
    res.json({ success: result.success, message: result.success ? 'Test email sent!' : result.error });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email', details: error.message });
  }
});

// Get email configuration status
app.get('/api/email/status', (req, res) => {
  res.json({
    configured: true,
    smtpUser: (process.env.SMTP_USER || 'bhavya.oberoi@learnapp.co').replace(/(.{3}).*(@.*)/, '$1***$2'),
    templates: Object.keys(emailTemplates)
  });
});

// Start server
app.listen(port, async () => {
  console.log(`API Server running on port ${port}`);
  await initDatabase();
});

