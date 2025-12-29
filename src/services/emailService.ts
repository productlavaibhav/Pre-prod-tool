// Email Service for ShootFlow
// Handles sending automated emails at each workflow step

const API_URL = import.meta.env.VITE_API_URL || 'https://divine-nature-production-c49a.up.railway.app';

export type EmailTemplate = 
  | 'newRequest'      // When a new shoot request is created
  | 'quoteSubmitted'  // When vendor submits a quote
  | 'quoteApproved'   // When quote is approved
  | 'quoteRejected'   // When quote is rejected
  | 'invoiceUploaded' // When invoice is uploaded
  | 'paymentComplete'; // When payment is marked complete

// Default email recipients for each workflow step
export const DEFAULT_RECIPIENTS = {
  vendor: 'vendor@example.com',           // Replace with actual vendor email
  approver: 'bhavya.oberoi@learnapp.co',  // Approver (Swati's email)
  finance: 'bhavya.oberoi@learnapp.co',   // Finance team
  admin: 'bhavya.oberoi@learnapp.co'      // Admin notifications
};

interface EmailPayload {
  to: string | string[];
  template: EmailTemplate;
  shoot: any;
}

/**
 * Send a single email
 */
export async function sendEmail(to: string, template: EmailTemplate, shoot: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, template, shoot })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✉️ Email sent: ${template} to ${to}`);
      return { success: true, messageId: result.messageId };
    } else {
      console.error(`❌ Email failed: ${template} to ${to}`, result.error);
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error(`❌ Email error: ${template}`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send emails to multiple recipients
 */
export async function sendBatchEmails(emails: EmailPayload[]): Promise<{ success: boolean; results: any[] }> {
  try {
    const response = await fetch(`${API_URL}/api/email/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails })
    });
    
    const result = await response.json();
    return { success: response.ok, results: result.results || [] };
  } catch (error: any) {
    console.error('❌ Batch email error:', error.message);
    return { success: false, results: [] };
  }
}

/**
 * Send test email to verify configuration
 */
export async function sendTestEmail(to?: string, template?: EmailTemplate): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_URL}/api/email/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, template })
    });
    
    const result = await response.json();
    return { success: result.success, message: result.message || result.error };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Get email service status
 */
export async function getEmailStatus(): Promise<{ configured: boolean; smtpUser: string; templates: string[] }> {
  try {
    const response = await fetch(`${API_URL}/api/email/status`);
    return await response.json();
  } catch (error) {
    return { configured: false, smtpUser: '', templates: [] };
  }
}

// ============================================
// WORKFLOW EMAIL TRIGGERS
// ============================================

/**
 * 1. New Request Created - Send to vendor for quote
 */
export async function emailNewRequest(shoot: any, vendorEmail: string = DEFAULT_RECIPIENTS.vendor) {
  return sendEmail(vendorEmail, 'newRequest', shoot);
}

/**
 * 2. Quote Submitted - Send to approver
 */
export async function emailQuoteSubmitted(shoot: any, approverEmail: string = DEFAULT_RECIPIENTS.approver) {
  return sendEmail(approverEmail, 'quoteSubmitted', shoot);
}

/**
 * 3. Quote Approved - Send to requestor and vendor
 */
export async function emailQuoteApproved(shoot: any, recipients: { requestorEmail?: string; vendorEmail?: string } = {}) {
  const emails: EmailPayload[] = [];
  
  // Send to requestor
  if (shoot.requestor?.email || recipients.requestorEmail) {
    emails.push({
      to: recipients.requestorEmail || shoot.requestor.email,
      template: 'quoteApproved',
      shoot
    });
  }
  
  // Send to vendor
  if (recipients.vendorEmail) {
    emails.push({
      to: recipients.vendorEmail,
      template: 'quoteApproved',
      shoot
    });
  }
  
  // Also notify admin
  emails.push({
    to: DEFAULT_RECIPIENTS.admin,
    template: 'quoteApproved',
    shoot
  });
  
  return sendBatchEmails(emails);
}

/**
 * 4. Quote Rejected - Send to requestor
 */
export async function emailQuoteRejected(shoot: any, requestorEmail?: string) {
  const to = requestorEmail || shoot.requestor?.email || DEFAULT_RECIPIENTS.admin;
  return sendEmail(to, 'quoteRejected', shoot);
}

/**
 * 5. Invoice Uploaded - Send to finance
 */
export async function emailInvoiceUploaded(shoot: any, financeEmail: string = DEFAULT_RECIPIENTS.finance) {
  return sendEmail(financeEmail, 'invoiceUploaded', shoot);
}

/**
 * 6. Payment Complete - Send to vendor
 */
export async function emailPaymentComplete(shoot: any, vendorEmail?: string) {
  const to = vendorEmail || DEFAULT_RECIPIENTS.vendor;
  return sendEmail(to, 'paymentComplete', shoot);
}






