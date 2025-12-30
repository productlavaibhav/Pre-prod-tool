import React, { useState, useEffect, useCallback } from 'react';
import { MainDashboard } from './components/MainDashboard';
import { VendorQuoteForm } from './components/VendorQuoteForm';
import { ApprovalScreen } from './components/ApprovalScreen';
import { InvoiceManagement } from './components/InvoiceManagement';
import { CreateRequestForm } from './components/CreateRequestForm';
import { FinanceDashboard } from './components/FinanceDashboard';
import { EquipmentCatalogManager, CatalogItem } from './components/EquipmentCatalogManager';
import { ArchiveScreen } from './components/ArchiveScreen';
import { NotificationToast, EmailThreadModal, EmailSentModal, type Notification, type Activity, type EmailMessage } from './components/NotificationSystem';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { EditShootForm } from './components/EditShootForm';
import { isSupabaseConfigured } from './lib/supabase';
import { DEFAULT_RECIPIENTS } from './services/emailService';

// API URL Configuration
// In production (Railway), use the production API
// In development (localhost), use local API
const API_URL = import.meta.env.DEV 
  ? 'http://localhost:3001' 
  : 'https://divine-nature-production-c49a.up.railway.app';

console.log('🔗 API:', API_URL, '| Mode:', import.meta.env.DEV ? 'DEV' : 'PROD');

export type ShootStatus = 
  | 'new_request' 
  | 'with_vendor' 
  | 'with_swati' 
  | 'ready_for_shoot' 
  | 'pending_invoice'
  | 'completed'
  | 'cancelled';

export interface Equipment {
  id: string;
  name: string;
  dailyRate?: number;
  quantity?: number;
  category?: string;
  expectedRate?: number;  // Rate from catalog (requestor's expected price)
  vendorRate?: number;    // Rate quoted by vendor
  isNew?: boolean;        // Flag to indicate item was added after approval
}

export interface Shoot {
  id: string;
  name: string;
  date: string;
  duration: string;
  location: string;
  equipment: Equipment[];
  status: ShootStatus;
  requestor: {
    name: string;
    avatar: string;
    email?: string;
  };
  vendorQuote?: {
    amount: number;
    notes: string;
  };
  approved?: boolean;
  approvedAmount?: number;
  invoiceFile?: {
    name: string;
    url: string;
    data?: string; // Base64 encoded PDF data
  };
  paid?: boolean;
  rejectionReason?: string;
  approvalEmail?: string;
  cancellationReason?: string;
  activities?: Activity[];
  emailThreadId?: string;
  createdAt?: Date;
  shootDate?: Date;
  // Multi-shoot support
  requestGroupId?: string;
  isMultiShoot?: boolean;
  multiShootIndex?: number;
  totalShootsInRequest?: number;
}

export type ViewMode = 'dashboard' | 'vendor' | 'approval' | 'invoice' | 'new_request' | 'finance' | 'catalog' | 'archive' | 'edit_shoot';

// LocalStorage keys - v2 to clear old data
const STORAGE_KEYS = {
  SHOOTS: 'shootflow_shoots_v3',  // Changed to v3 to clear old cached data
  CATALOG: 'shootflow_catalog_v3',
  NOTIFICATIONS: 'shootflow_notifications_v3',
  VIEW_MODE: 'shootflow_viewMode',
  SELECTED_SHOOT: 'shootflow_selectedShoot',
};

// Helper to safely parse JSON from localStorage
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects for shoots
      if (key === STORAGE_KEYS.SHOOTS && Array.isArray(parsed)) {
        return parsed.map((shoot: any) => ({
          ...shoot,
          createdAt: shoot.createdAt ? new Date(shoot.createdAt) : undefined,
          shootDate: shoot.shootDate ? new Date(shoot.shootDate) : undefined,
          activities: shoot.activities?.map((a: any) => ({
            ...a,
            timestamp: new Date(a.timestamp),
          })),
        })) as T;
      }
      if (key === STORAGE_KEYS.NOTIFICATIONS && Array.isArray(parsed)) {
        return parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
          emailMessages: n.emailMessages?.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        })) as T;
      }
      return parsed;
    }
  } catch (e) {
    console.error(`Error loading ${key} from localStorage:`, e);
  }
  return defaultValue;
};

// Helper to save to localStorage
const saveToStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
};

function AppContent() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  
  // Check if this is a vendor link (opens form only) - vendors don't need login
  const urlParams = new URLSearchParams(window.location.search);
  const vendorShootId = urlParams.get('vendor');
  
  // If not authenticated and not a vendor link, show login
  if (!isAuthenticated && !vendorShootId) {
    return <LoginPage />;
  }
  
  // Load viewMode from localStorage, default to dashboard
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (vendorShootId) return 'vendor';
    const saved = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
    return (saved as ViewMode) || 'dashboard';
  });
  const [selectedShootId, setSelectedShootId] = useState<string | null>(() => {
    if (vendorShootId) return vendorShootId;
    return localStorage.getItem(STORAGE_KEYS.SELECTED_SHOOT);
  });
  
  // Save viewMode and selectedShoot to localStorage when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode);
  }, [viewMode]);
  
  useEffect(() => {
    if (selectedShootId) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_SHOOT, selectedShootId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_SHOOT);
    }
  }, [selectedShootId]);
  
  // Notification system state - load from localStorage
  const [notifications, setNotifications] = useState<Notification[]>(() => 
    loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, [])
  );
  const [toastNotifications, setToastNotifications] = useState<Notification[]>([]);
  const [selectedEmailThread, setSelectedEmailThread] = useState<Notification | null>(null);
  const [emailSentModal, setEmailSentModal] = useState<EmailMessage | null>(null);

  // Helper function to create email messages for a thread
  const createEmailThread = (shootName: string, requestorEmail: string): EmailMessage[] => {
    return [];
  };

  // Add notification helper
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
    setToastNotifications(prev => [newNotification, ...prev]);
  };

  // Add activity to shoot
  const addActivityToShoot = async (shootId: string, action: string, description: string, emailTriggered: boolean = false) => {
        const newActivity: Activity = {
          id: Date.now().toString(),
          shootId,
          action,
          description,
          timestamp: new Date(),
          emailTriggered,
        };
    
    // Use functional update to get the CURRENT state, not stale closure
    setShoots(prev => {
      const shoot = prev.find(s => s.id === shootId);
      if (!shoot) return prev;
      
      const updatedShoot = {
          ...shoot,
          activities: [...(shoot.activities || []), newActivity],
        };
      
      // Save to API with current state
      saveShootToAPI(updatedShoot);
      
      return prev.map(s => s.id === shootId ? updatedShoot : s);
    });
  };

  // EmailJS Configuration
  const EMAILJS_SERVICE_ID = 'service_vcb4aia';
  const EMAILJS_TEMPLATE_ID = 'template_dj4cn59';
  // Email is now handled via SMTP through the backend API
  // See src/services/emailService.ts for email functions

  // Trigger email via SMTP (real email) and add to UI notification thread
  const triggerEmail = async (
    shootId: string,
    shootName: string,
    emailType: 'new_request' | 'new_request_multi' | 'sent_to_vendor' | 'quote_submitted' | 'approved' | 'rejected' | 'invoice_reminder' | 'invoice_uploaded' | 'payment_complete',
    recipientEmail: string,
    additionalData?: {
      dates?: string;
      itemCount?: number;
      estimatedBudget?: number;
      quoteAmount?: number;
      location?: string;
      requestorName?: string;
      equipmentList?: Array<{ name: string; dailyRate: number; quantity?: number }>;
      shoot?: Shoot;
      shoots?: any[]; // For multi-shoot requests
    }
  ) => {
    const emailSubjects: Record<string, string> = {
      new_request: `🔔 ACTION REQUIRED: New Shoot Request - ${shootName}`,
      new_request_multi: `🔔 ACTION REQUIRED: New Equipment Request - ${shootName}`,
      sent_to_vendor: `🔗 Action Required: Send vendor link for ${shootName}`,
      quote_submitted: `✅ Vendor Quote Received: ${shootName}`,
      approved: `🎉 Quote Approved: ${shootName} - Ready for Shoot`,
      rejected: `❌ Quote Rejected: ${shootName} - Revision Required`,
      invoice_reminder: `⏰ Invoice Reminder: ${shootName} - Please upload invoice`,
      invoice_uploaded: `📄 Invoice Uploaded: ${shootName}`,
      payment_complete: `💵 Payment Completed: ${shootName}`,
    };

    // Map email types to SMTP templates
    const templateMap: Record<string, string> = {
      new_request: 'newRequest',
      new_request_multi: 'newRequestMulti',
      sent_to_vendor: 'newRequest',
      quote_submitted: 'quoteSubmitted',
      approved: 'quoteApproved',
      rejected: 'quoteRejected',
      invoice_reminder: 'invoiceReminder',
      invoice_uploaded: 'invoiceUploaded',
      payment_complete: 'paymentComplete',
    };

    // Get recipient name from email
          const recipientName = recipientEmail.split('@')[0].split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ');

    // Get shoot data for email template
    const existingShootForData = shoots.find(s => s.id === shootId);
    const shootData = additionalData?.shoot || existingShootForData || {
      id: shootId,
      name: shootName,
      date: additionalData?.dates || 'TBD',
      location: additionalData?.location || 'TBD',
      equipment: additionalData?.equipmentList?.map(e => ({ name: e.name, dailyRate: e.dailyRate, quantity: e.quantity || 1 })) || [],
      requestor: { name: additionalData?.requestorName || 'ShootFlow Team', email: recipientEmail },
      vendorQuote: { amount: additionalData?.quoteAmount || 0, notes: '' },
      approvedAmount: additionalData?.quoteAmount || 0,
      recipientName: recipientName,
    };

    // For Gmail threading: ensure all emails in a request group have the same subject
    // Use a consistent threadSubject based on requestGroupId or first shoot name
    if (existingShootForData?.requestGroupId) {
      // Find all shoots in this request group to create a consistent subject
      const groupShoots = shoots.filter(s => s.requestGroupId === existingShootForData.requestGroupId);
      const firstShootInGroup = groupShoots.sort((a, b) => (a.multiShootIndex || 0) - (b.multiShootIndex || 0))[0];
      (shootData as any).threadSubject = firstShootInGroup?.name || shootName;
      (shootData as any).requestGroupId = existingShootForData.requestGroupId;
    }

    // For multi-shoot, add shoots array
    if (emailType === 'new_request_multi' && additionalData?.shoots) {
      (shootData as any).shoots = additionalData.shoots;
      (shootData as any).recipientName = recipientName;
      // Use combined name for thread subject
      (shootData as any).threadSubject = shootName;
    }

    // Create the email for UI notification
    const newEmail: EmailMessage = {
      id: Date.now().toString(),
      from: emailType === 'quote_submitted' ? 'vendor@gopalamedia.com' : 'bhavya.oberoi@learnapp.co',
      to: recipientEmail,
      subject: emailSubjects[emailType],
      body: `Email sent via SMTP for ${shootName}`,
      timestamp: new Date(),
      type: emailType === 'quote_submitted' ? 'received' : 'sent',
    };

    // Create notification with email thread
    const emailThread: EmailMessage[] = [];
    const existingNotification = notifications.find(n => n.shootId === shootId && n.emailThread);
    if (existingNotification?.emailThread) {
      emailThread.push(...existingNotification.emailThread);
    }
    emailThread.push(newEmail);

    addNotification({
      type: 'email',
      title: emailSubjects[emailType],
      message: `Email sent to ${recipientEmail}`,
      shootId,
      shootName,
      emailThread,
    });

    // Send REAL email via SMTP backend with threading support
    const template = templateMap[emailType];
    if (template) {
      try {
        // Get existing thread message ID from shoot or request group for threading
        const existingShoot = shoots.find(s => s.id === shootId);
        let threadMessageId = existingShoot?.emailThreadId || null;
        
        // If no threadMessageId on this shoot, check other shoots in same request group
        if (!threadMessageId && existingShoot?.requestGroupId) {
          const groupShoot = shoots.find(s => 
            s.requestGroupId === existingShoot.requestGroupId && s.emailThreadId
          );
          threadMessageId = groupShoot?.emailThreadId || null;
          console.log(`📧 Found thread ID from request group: ${threadMessageId}`);
        }
        
        const response = await fetch(`${API_URL}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipientEmail,
            template,
            shoot: shootData,
            threadMessageId // Pass existing thread ID for email threading
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✉️ Real email sent: ${emailType} to ${recipientEmail} - messageId: ${result.messageId}${threadMessageId ? ' (threaded)' : ''}`);
          
          // Show the Email Sent Modal ONLY after successful send
          setEmailSentModal(newEmail);
          
          // Add activity for successful email
          addActivityToShoot(shootId, `Email: ${emailSubjects[emailType]}`, `Sent to ${recipientEmail}`, true);
          
          // If this is the first email (new_request), store the messageId for threading
          // Also store it for ALL shoots in the request group
          if ((emailType === 'new_request' || emailType === 'new_request_multi') && result.messageId && !threadMessageId) {
            // Update the shoot with the email thread ID for future emails
            const shootToUpdate = shoots.find(s => s.id === shootId);
            if (shootToUpdate) {
              const requestGroupId = shootToUpdate.requestGroupId;
              
              // Update this shoot
              const updatedShoot = { ...shootToUpdate, emailThreadId: result.messageId };
              await saveShootToAPI(updatedShoot);
              
              // Also update all related shoots in the same request group
              if (requestGroupId) {
                const relatedShoots = shoots.filter(s => s.requestGroupId === requestGroupId && s.id !== shootId);
                for (const related of relatedShoots) {
                  const updatedRelated = { ...related, emailThreadId: result.messageId };
                  await saveShootToAPI(updatedRelated);
                }
                // Update state for all shoots at once
                setShoots(prev => prev.map(s => 
                  s.requestGroupId === requestGroupId 
                    ? { ...s, emailThreadId: result.messageId }
                    : s
                ));
                console.log(`📧 Stored email thread ID for request group ${requestGroupId}: ${result.messageId}`);
              } else {
                setShoots(prev => prev.map(s => s.id === shootId ? updatedShoot : s));
                console.log(`📧 Stored email thread ID for shoot ${shootId}: ${result.messageId}`);
              }
            }
          }
        } else {
          const errorText = await response.text();
          console.error(`❌ Email failed: ${emailType}`, errorText);
          // Don't show modal on failure - email wasn't sent
        }
      } catch (error) {
        console.error(`❌ Email error: ${emailType}`, error);
        // Don't show modal on error - email wasn't sent
      }
    }
  };
  
  // Equipment Catalog - default data
  const defaultCatalogItems: CatalogItem[] = [
    // Cameras
    { id: '1', name: 'Camera Sony A7S3', dailyRate: 1500, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '2', name: 'Camera Sony A7siii', dailyRate: 1500, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '3', name: 'Camera Sony Fx3', dailyRate: 1800, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '4', name: 'Camera Sony A7iv', dailyRate: 1800, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '5', name: 'Camera Sony A74', dailyRate: 1800, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '6', name: 'Sony FX3', dailyRate: 1800, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '7', name: 'GoPro Hero 13', dailyRate: 1500, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '8', name: 'Gopro 13 with Underwater Housing', dailyRate: 1800, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '9', name: 'DJI Action Camera with Mounts', dailyRate: 1800, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '10', name: 'Gimbal Ronin RS4', dailyRate: 1500, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '11', name: 'RS3 Pro Gimbal', dailyRate: 1500, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '12', name: 'ND Filter Tiffen', dailyRate: 500, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '13', name: 'Nisi ND Filter', dailyRate: 500, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '14', name: 'BPM 1/4 Filter', dailyRate: 500, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '15', name: 'Black Pro Mist 1/4', dailyRate: 500, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '16', name: 'Black Pro Mist 1/8', dailyRate: 500, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '17', name: 'CPL Filter', dailyRate: 500, category: 'Camera', lastUpdated: 'Dec 10' },
    { id: '18', name: 'Variable ND Filter with CPL 2in1', dailyRate: 700, category: 'Camera', lastUpdated: 'Dec 10' },
    
    // Lenses
    { id: '19', name: 'Sony Lens 24-70mm GM', dailyRate: 1200, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '20', name: 'Sony Lens 24-70mm GM2', dailyRate: 1200, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '21', name: 'Sony Lens 28-70mm GM', dailyRate: 1500, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '22', name: 'Sony Lens 16-35mm GM', dailyRate: 1000, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '23', name: 'Sony Lens 16-35mm GM II', dailyRate: 1500, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '24', name: 'Sony Lens 70-200mm GM', dailyRate: 1200, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '25', name: 'Sony Lens 70-200mm GM II', dailyRate: 1500, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '26', name: 'Sony Lens 50mm GM f1.2', dailyRate: 1500, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '27', name: 'Sony Lens 50mm GM2 f1.4', dailyRate: 1200, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '28', name: 'Sony Lens 85mm GM2', dailyRate: 1400, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '29', name: 'Sony Lens 90mm Macro', dailyRate: 1000, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '30', name: 'Sony Lens 135mm F1.8', dailyRate: 1400, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '31', name: 'Sony Lens 12-24mm', dailyRate: 2200, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '32', name: 'Sony Lens 11mm', dailyRate: 1500, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '33', name: 'Sony Lens 14mm', dailyRate: 1400, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '34', name: 'Sony Lens 20mm', dailyRate: 1000, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '35', name: 'Sony Lens 24mm', dailyRate: 1200, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '36', name: 'Sony Lens 35mm', dailyRate: 1000, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '37', name: 'Sony Lens 50-150mm f2', dailyRate: 2800, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '38', name: 'Probe Lens (Straight Tube)', dailyRate: 3500, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '39', name: 'Ultra Wide 10mm Lens', dailyRate: 1500, category: 'Lens', lastUpdated: 'Dec 10' },
    { id: '40', name: 'Tiffen CPL (Circular Polarizer)', dailyRate: 500, category: 'Lens', lastUpdated: 'Dec 10' },
    
    // Lights
    { id: '41', name: 'Amaran 200x with 65mm Softbox', dailyRate: 1200, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '42', name: 'Amaran 200x with 45mm Softbox', dailyRate: 1200, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '43', name: 'Amaran 200x with Lantern', dailyRate: 1700, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '44', name: 'Amaran 200x', dailyRate: 800, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '45', name: 'Amaran 300c with 90mm Softbox', dailyRate: 1500, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '46', name: 'Amaran 300c with Spot Mount', dailyRate: 2000, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '47', name: 'Amaran 300c with Lantern', dailyRate: 1500, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '48', name: 'Amaran 300x with Softbox', dailyRate: 1500, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '49', name: 'Amaran 60x with 45mm Softbox', dailyRate: 800, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '50', name: 'Amaran 60x with Barndoor', dailyRate: 800, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '51', name: 'Amaran 80c', dailyRate: 1000, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '52', name: 'Amaran RGB Tube T4c with Grid', dailyRate: 1000, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '53', name: 'Amaran RGB Tube 4ft', dailyRate: 1000, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '54', name: 'Amaran RGB Tube 2ft', dailyRate: 700, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '55', name: 'Aputure 1200d Pro', dailyRate: 2500, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '56', name: 'Aputure Storm 1200x', dailyRate: 3000, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '57', name: 'Aputure 600x Full Kit', dailyRate: 1700, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '58', name: 'Aputure 600c Pro II with Bowen Mount', dailyRate: 2500, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '59', name: 'Aputure 300x', dailyRate: 1500, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '60', name: 'Aputure Nova P600c Kit', dailyRate: 2000, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '61', name: 'Aputure Nova P300', dailyRate: 1800, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '62', name: 'Aputure Fresnel 2x', dailyRate: 500, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '63', name: 'F10 Fresnel with Barndoor', dailyRate: 1500, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '64', name: 'Infinibar PB12', dailyRate: 2000, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '65', name: 'Infinibar PB3', dailyRate: 1500, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '66', name: 'Spotlight Mount Full Kit', dailyRate: 1000, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '67', name: 'Gobo Full Kit with Attachments', dailyRate: 1000, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '68', name: 'Lantern Softbox', dailyRate: 500, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '69', name: '65mm Lantern with Cover', dailyRate: 500, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '70', name: 'Storm 80c with Katora and Grid', dailyRate: 1200, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '71', name: 'Storm 60x with Mount', dailyRate: 1400, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '72', name: 'Forza 80x with Softbox', dailyRate: 1000, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '73', name: 'Forza 60 with Barndoor', dailyRate: 800, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '74', name: 'Godox LC 500R', dailyRate: 500, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '75', name: 'Nanlite 720', dailyRate: 2000, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '76', name: 'Matt Light', dailyRate: 1000, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '77', name: 'Magic Arm with Clamp', dailyRate: 400, category: 'Light', lastUpdated: 'Dec 10' },
    { id: '78', name: 'Ball Head for Top Cam', dailyRate: 500, category: 'Light', lastUpdated: 'Dec 10' },
    
    // Tripods
    { id: '79', name: 'Terris Tripod', dailyRate: 400, category: 'Tripod', lastUpdated: 'Dec 10' },
    { id: '80', name: 'Photo Tripod', dailyRate: 500, category: 'Tripod', lastUpdated: 'Dec 10' },
    { id: '81', name: 'Slider 4ft', dailyRate: 1000, category: 'Tripod', lastUpdated: 'Dec 10' },
    { id: '82', name: '6ft Manual Slider with Tripod', dailyRate: 2000, category: 'Tripod', lastUpdated: 'Dec 10' },
    { id: '83', name: 'Electronic Slider Full Kit', dailyRate: 6000, category: 'Tripod', lastUpdated: 'Dec 10' },
    { id: '84', name: 'Ball Head', dailyRate: 500, category: 'Tripod', lastUpdated: 'Dec 10' },
    
    // Audio
    { id: '85', name: 'Sennheiser G4 Lapel Mic', dailyRate: 500, category: 'Audio', lastUpdated: 'Dec 10' },
    { id: '86', name: 'Rode/Hollyland Mic', dailyRate: 500, category: 'Audio', lastUpdated: 'Dec 10' },
    { id: '87', name: 'Wireless Cordless Mic', dailyRate: 500, category: 'Audio', lastUpdated: 'Dec 10' },
    { id: '88', name: 'Zoom H6 Recorder', dailyRate: 800, category: 'Audio', lastUpdated: 'Dec 10' },
    { id: '89', name: 'Mix Pre 10 Mixer', dailyRate: 2500, category: 'Audio', lastUpdated: 'Dec 10' },
    { id: '90', name: 'Audio Mixer Mix Pree', dailyRate: 3000, category: 'Audio', lastUpdated: 'Dec 10' },
    { id: '91', name: 'Boom Rod with Jumbo Stand', dailyRate: 300, category: 'Audio', lastUpdated: 'Dec 10' },
    { id: '92', name: 'Boom Mic', dailyRate: 700, category: 'Audio', lastUpdated: 'Dec 10' },
    { id: '93', name: 'Handle Mic', dailyRate: 1000, category: 'Audio', lastUpdated: 'Dec 10' },
    { id: '94', name: 'Speakers', dailyRate: 5000, category: 'Audio', lastUpdated: 'Dec 10' },
    { id: '95', name: 'Insta 360 X4 Full Kit', dailyRate: 5000, category: 'Audio', lastUpdated: 'Dec 10' },
    
    // Small Equipments / Accessories
    { id: '96', name: 'Accessories Kit (C-Stand, Clamps, Grips)', dailyRate: 2500, category: 'Small Equipments', lastUpdated: 'Dec 10' },
    { id: '97', name: 'Floppy Flag, Diffusion, Long Boards Kit', dailyRate: 2500, category: 'Small Equipments', lastUpdated: 'Dec 10' },
    { id: '98', name: 'Magic Arm with Super Clamp', dailyRate: 500, category: 'Small Equipments', lastUpdated: 'Dec 10' },
    { id: '99', name: 'Chimera (Half, Quarter) with Frame 6x6', dailyRate: 1200, category: 'Small Equipments', lastUpdated: 'Dec 10' },
    { id: '100', name: 'Black Cloth 20x20', dailyRate: 2000, category: 'Small Equipments', lastUpdated: 'Dec 10' },
    { id: '101', name: 'Black Cloth 15x15', dailyRate: 1500, category: 'Small Equipments', lastUpdated: 'Dec 10' },
    { id: '102', name: 'Black Cloth 12x12 with Frame', dailyRate: 1000, category: 'Small Equipments', lastUpdated: 'Dec 10' },
    { id: '103', name: 'Black Cloth 10x10 with Frame', dailyRate: 800, category: 'Small Equipments', lastUpdated: 'Dec 10' },
    
    // Extras
    { id: '104', name: 'Shogun Monitor with Stand', dailyRate: 1500, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '105', name: 'Ninja V Monitor', dailyRate: 800, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '106', name: 'Fog Machine Portable', dailyRate: 1200, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '107', name: 'Big Smoke Machine', dailyRate: 1500, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '108', name: 'Green Screen (Chroma Key 8x8)', dailyRate: 1000, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '109', name: 'White Backdrop', dailyRate: 2000, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '110', name: 'Blue Backdrop', dailyRate: 2000, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '111', name: 'Red Backdrop', dailyRate: 2000, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '112', name: 'Mocha Backdrop', dailyRate: 2000, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '113', name: 'Black Magic ATM Mini Pro', dailyRate: 3000, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '114', name: 'Black Magic Switcher 9 Input', dailyRate: 3500, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '115', name: 'Teleprompter with Operator', dailyRate: 5000, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '116', name: 'DJI Mavic 4 Pro Drone Full Kit', dailyRate: 6000, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '117', name: 'Silver Bounce with Frame 6x6', dailyRate: 800, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '118', name: 'Ultra Bounce 6x6', dailyRate: 800, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '119', name: 'Skimmer', dailyRate: 800, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '120', name: 'Frame 8x8 with Stand', dailyRate: 500, category: 'Extra', lastUpdated: 'Dec 10' },
    { id: '121', name: 'Masking Tape, Boom Stand, Bounce Board Kit', dailyRate: 3000, category: 'Extra', lastUpdated: 'Dec 10' },
    
    // Crew / Assistant
    { id: '122', name: 'Camera Assistant', dailyRate: 2000, category: 'Assistant', lastUpdated: 'Dec 10' },
    { id: '123', name: 'Assistant (General)', dailyRate: 2000, category: 'Assistant', lastUpdated: 'Dec 10' },
    { id: '124', name: 'Gaffer', dailyRate: 4000, category: 'Gaffer', lastUpdated: 'Dec 10' },
    { id: '125', name: 'Gaffer Assistant', dailyRate: 2000, category: 'Gaffer', lastUpdated: 'Dec 10' },
    { id: '126', name: 'Sound Person', dailyRate: 6000, category: 'Assistant', lastUpdated: 'Dec 10' },
    { id: '127', name: 'Cameraman', dailyRate: 10000, category: 'Assistant', lastUpdated: 'Dec 10' },
    { id: '128', name: 'Gimbal Operator', dailyRate: 10000, category: 'Assistant', lastUpdated: 'Dec 10' },
    { id: '129', name: 'DOP (Director of Photography)', dailyRate: 15000, category: 'Assistant', lastUpdated: 'Dec 10' },
    { id: '130', name: 'Cinematographer', dailyRate: 15000, category: 'Assistant', lastUpdated: 'Dec 10' },
    
    // Transport
    { id: '131', name: 'Transportation (Local)', dailyRate: 2000, category: 'Transport', lastUpdated: 'Dec 10' },
    { id: '132', name: 'Transportation (Outstation)', dailyRate: 5000, category: 'Transport', lastUpdated: 'Dec 10' },
    { id: '133', name: 'Transportation (Extra Hours)', dailyRate: 4000, category: 'Transport', lastUpdated: 'Dec 10' },
  ];

  // Load catalog from localStorage, fallback to defaults
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(() => 
    loadFromStorage(STORAGE_KEYS.CATALOG, defaultCatalogItems)
  );
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Default shoots data - empty, users will create their own
  const defaultShoots: Shoot[] = [];

  // Load shoots from localStorage, fallback to defaults
  const [shoots, setShoots] = useState<Shoot[]>(() => 
    loadFromStorage(STORAGE_KEYS.SHOOTS, defaultShoots)
  );

  // Load data from API on mount (if configured)
  useEffect(() => {
    const loadDataFromAPI = async () => {
      if (!API_URL) {
        console.log('API not configured, using localStorage');
        setIsLoadingData(false);
        return;
      }

      try {
        const apiEndpoint = `${API_URL}/api/shoots`;
        console.log('📡 Fetching shoots from:', apiEndpoint);
        
        // Try to load shoots from API
        const shootsResponse = await fetch(apiEndpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        console.log('📡 Response status:', shootsResponse.status, shootsResponse.statusText);
        
        if (shootsResponse.ok) {
          const shootsData = await shootsResponse.json();
          console.log('✅ Shoots loaded:', shootsData?.length, 'items');
          // Only use API data if we got a valid response
          if (Array.isArray(shootsData)) {
            const formattedShoots: Shoot[] = shootsData.map((s: any) => ({
              id: s.id,
              name: s.name,
              date: s.date,
              duration: s.duration,
              location: s.location,
              equipment: s.equipment || [],
              status: s.status,
              requestor: s.requestor,
              vendorQuote: s.vendor_quote,
              approved: s.approved,
              approvedAmount: s.approved_amount,
              invoiceFile: s.invoice_file,
              paid: s.paid,
              rejectionReason: s.rejection_reason,
              approvalEmail: s.approval_email,
              cancellationReason: s.cancellation_reason,
              activities: s.activities || [],
              emailThreadId: s.email_thread_id,
              createdAt: s.created_at ? new Date(s.created_at) : undefined,
              shootDate: s.shoot_date ? new Date(s.shoot_date) : undefined,
              requestGroupId: s.request_group_id,
              isMultiShoot: s.is_multi_shoot,
              multiShootIndex: s.multi_shoot_index,
              totalShootsInRequest: s.total_shoots_in_request,
            }));
            setShoots(formattedShoots);
            console.log('Loaded', formattedShoots.length, 'shoots from API');
          }
        } else {
          console.log('API returned error, keeping localStorage data');
        }

        // Try to load catalog from API
        try {
          const catalogResponse = await fetch(`${API_URL}/api/catalog`, {
            signal: AbortSignal.timeout(5000)
          });
          if (catalogResponse.ok) {
            const catalogData = await catalogResponse.json();
            const apiCatalog: CatalogItem[] = (catalogData || []).map((c: any) => ({
              id: String(c.id), // Ensure ID is string
              name: c.name,
              dailyRate: parseFloat(c.daily_rate) || 0,
              category: c.category,
              lastUpdated: c.last_updated,
            }));
            
            // Merge API data with defaults - API items take precedence, but keep defaults if not in API
            const apiIds = new Set(apiCatalog.map(c => String(c.id)));
            const mergedCatalog = [
              ...defaultCatalogItems.filter(d => !apiIds.has(String(d.id))), // Defaults first
              ...apiCatalog, // Then API items (including new ones)
            ];
            setCatalogItems(mergedCatalog);
            console.log('Loaded', apiCatalog.length, 'catalog items from API, merged with', defaultCatalogItems.length, 'defaults, total:', mergedCatalog.length);
          } else {
            // API failed, use defaults
            console.log('Catalog API returned error, using defaults');
            setCatalogItems(defaultCatalogItems);
          }
        } catch (catalogError) {
          console.log('Catalog fetch failed, using defaults:', catalogError);
          setCatalogItems(defaultCatalogItems);
        }
      } catch (error) {
        console.error('❌ API not available. Error:', error);
        // Show alert for debugging on production
        if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
          console.error('Failed to load from API:', API_URL);
        }
      } finally {
        setIsLoadingData(false);
      }
    };

    loadDataFromAPI();
  }, []);

  // Persist catalog to localStorage (and Supabase if configured)
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CATALOG, catalogItems);
  }, [catalogItems]);

  // Always persist shoots to localStorage as backup
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SHOOTS, shoots);
  }, [shoots]);

  // Persist notifications to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
  }, [notifications]);

  // Helper function to save shoot to API
  const saveShootToAPI = async (shoot: Shoot) => {
    if (!API_URL) return;
    
    const dbShoot = {
      id: shoot.id,
      name: shoot.name,
      date: shoot.date,
      duration: shoot.duration,
      location: shoot.location,
      equipment: shoot.equipment,
      status: shoot.status,
      requestor: shoot.requestor,
      vendor_quote: shoot.vendorQuote,
      approved: shoot.approved,
      approved_amount: shoot.approvedAmount,
      invoice_file: shoot.invoiceFile,
      paid: shoot.paid,
      rejection_reason: shoot.rejectionReason,
      approval_email: shoot.approvalEmail,
      cancellation_reason: shoot.cancellationReason,
      activities: shoot.activities,
      email_thread_id: shoot.emailThreadId,
      created_at: shoot.createdAt?.toISOString(),
      shoot_date: shoot.shootDate?.toISOString(),
      request_group_id: shoot.requestGroupId,
      is_multi_shoot: shoot.isMultiShoot,
      multi_shoot_index: shoot.multiShootIndex,
      total_shoots_in_request: shoot.totalShootsInRequest,
    };

    try {
      console.log('Saving to API:', dbShoot.id, 'status:', dbShoot.status);
      const response = await fetch(`${API_URL}/api/shoots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbShoot),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('API save successful:', result.id, 'new status:', result.status);
        return result;
      } else {
        const errorText = await response.text();
        console.error('API save failed with status:', response.status, errorText);
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error('API save error:', error);
      throw error; // Re-throw so callers can handle it
    }
  };

  // Helper function to save a single catalog item to API
  const saveCatalogItemToAPI = async (item: CatalogItem) => {
    if (!API_URL) return;
    
    const dbItem = {
      id: item.id,
      name: item.name,
      daily_rate: item.dailyRate,
      category: item.category,
      last_updated: new Date().toISOString(),
    };

    try {
      console.log('Saving catalog item to API:', dbItem.name);
      const response = await fetch(`${API_URL}/api/catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbItem),
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Catalog item saved successfully:', result.name);
        return result;
      } else {
        const errorText = await response.text();
        console.error('Catalog save failed:', response.status, errorText);
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Catalog save error:', error);
      throw error;
    }
  };

  // Helper function to parse shoot date and get end date
  const parseShootEndDate = (dateStr: string): Date | null => {
    try {
      // Handle formats like "Oct 12-13", "Oct 8-10", "Nov 2-5", "Oct 15", "Oct 20"
      const months: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const parts = dateStr.split(' ');
      if (parts.length < 2) return null;
      
      const monthStr = parts[0];
      const month = months[monthStr];
      if (month === undefined) return null;
      
      const dayPart = parts[1];
      let endDay: number;
      
      if (dayPart.includes('-')) {
        // Range format: "12-13" -> get end day (13)
        const [, end] = dayPart.split('-').map(d => parseInt(d));
        endDay = end;
      } else {
        // Single day: "15"
        endDay = parseInt(dayPart);
      }
      
      if (isNaN(endDay)) return null;
      
      // Use current year, but if month is in the past, assume next year
      const today = new Date();
      let year = today.getFullYear();
      const checkDate = new Date(year, month, endDay, 23, 59, 59);
      
      return checkDate;
    } catch {
      return null;
    }
  };

  // Automatically move Active Shoots to Pending Invoice when end date passes
  useEffect(() => {
    const checkAndUpdateShoots = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let hasUpdates = false;
      const updatedShoots = shoots.map(shoot => {
        if (shoot.status === 'ready_for_shoot') {
          const endDate = parseShootEndDate(shoot.date);
          if (endDate && endDate < today) {
            hasUpdates = true;
            // Add activity
            const newActivity: Activity = {
              id: Date.now().toString() + shoot.id,
              shootId: shoot.id,
              action: 'Shoot Completed',
              description: 'Shoot date has passed. Moved to Pending Invoice.',
              timestamp: new Date(),
              emailTriggered: false,
            };
            return {
              ...shoot,
              status: 'pending_invoice' as ShootStatus,
              activities: [...(shoot.activities || []), newActivity],
            };
          }
        }
        return shoot;
      });
      
      if (hasUpdates) {
        setShoots(updatedShoots);
      }
    };

    // Check immediately and then every minute
    checkAndUpdateShoots();
    const interval = setInterval(checkAndUpdateShoots, 60000);
    
    return () => clearInterval(interval);
  }, [shoots]);

  // Automatic Invoice Reminder - Send email 7 days after shoot completed without invoice
  useEffect(() => {
    const checkInvoiceReminders = () => {
      const today = new Date();
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      
      shoots.forEach(shoot => {
        // Only check shoots in pending_invoice status without an invoice
        if (shoot.status !== 'pending_invoice' || shoot.invoiceFile) return;
        
        // Find when the shoot was moved to pending_invoice
        const completedActivity = shoot.activities?.find(a => 
          a.action === 'Shoot Completed' || a.action.includes('Pending Invoice')
        );
        
        if (!completedActivity) return;
        
        const completedDate = new Date(completedActivity.timestamp);
        const daysSinceComplete = today.getTime() - completedDate.getTime();
        
        // Check if it's been 7+ days and we haven't sent a reminder yet
        const reminderSent = shoot.activities?.some(a => 
          a.action.includes('Invoice Reminder Sent')
        );
        
        if (daysSinceComplete >= SEVEN_DAYS_MS && !reminderSent) {
          console.log(`📧 Sending invoice reminder for ${shoot.name} (7+ days without invoice)`);
          
          // Send invoice reminder email
          triggerEmail(
            shoot.id,
            shoot.name,
            'invoice_reminder',
            shoot.requestor.email || DEFAULT_RECIPIENTS.admin,
            {
              shoot: {
                ...shoot,
                vendorName: 'Gopala Media'
              }
            }
          );
          
          // Mark that we sent a reminder (to avoid duplicate emails)
          addActivityToShoot(
            shoot.id, 
            'Invoice Reminder Sent', 
            'Automated reminder sent - 7 days since shoot completion without invoice'
          );
        }
      });
    };
    
    // Check on mount and every hour
    checkInvoiceReminders();
    const interval = setInterval(checkInvoiceReminders, 60 * 60 * 1000); // Check every hour
    
    return () => clearInterval(interval);
  }, [shoots]);

  const handleSendToVendor = async (shootId: string) => {
    const shoot = shoots.find(s => s.id === shootId);
    if (shoot) {
      const updatedShoot = { ...shoot, status: 'with_vendor' as ShootStatus };
      
      // Save to API first
      await saveShootToAPI(updatedShoot);
      
      setShoots(prev => prev.map(s => 
        s.id === shootId ? updatedShoot : s
      ));
      
      // Trigger email notification
      triggerEmail(
        shootId, 
        shoot.name, 
        'sent_to_vendor', 
        shoot.requestor.email || 'anish@company.com'
      );
      
      addActivityToShoot(shootId, 'Sent to Vendor', 'Equipment request sent to Gopala Media for quotation');
    }
  };

  // Track pending quote submissions for batch email
  const pendingQuoteSubmissions = React.useRef<{ shootId: string; shoot: Shoot; amount: number }[]>([]);
  const quoteSubmissionTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handleVendorSubmit = async (shootId: string, amount: number, notes: string, itemizedPrices?: { id: string; vendorRate: number }[]) => {
    const shoot = shoots.find(s => s.id === shootId);
    if (!shoot) {
      console.error('Shoot not found:', shootId);
      throw new Error('Shoot not found');
    }
      
      // Update equipment with vendor rates if provided
    let updatedEquipment = shoot.equipment;
      if (itemizedPrices && itemizedPrices.length > 0) {
      updatedEquipment = shoot.equipment.map(eq => {
          const priceInfo = itemizedPrices.find(p => p.id === eq.id);
          return priceInfo ? { ...eq, vendorRate: priceInfo.vendorRate } : eq;
        });
      }
      
    const updatedShoot = { 
      ...shoot, 
        status: 'with_swati' as ShootStatus,
        equipment: updatedEquipment,
        vendorQuote: { amount, notes }
      };
    
    // Update local state first for immediate UI feedback
    setShoots(prev => prev.map(s => s.id === shootId ? updatedShoot : s));
    
    // Then save to API (don't block on this)
    try {
      await saveShootToAPI(updatedShoot);
    } catch (error) {
      console.error('API save failed, data saved locally:', error);
    }
    
    // Add to pending submissions (for batch email)
    pendingQuoteSubmissions.current.push({ shootId, shoot: updatedShoot, amount });
    
    // Clear any existing timer and set a new one
    // This ensures we wait for all shoots to be submitted before sending ONE email
    if (quoteSubmissionTimer.current) {
      clearTimeout(quoteSubmissionTimer.current);
    }
    
    quoteSubmissionTimer.current = setTimeout(async () => {
      const submissions = [...pendingQuoteSubmissions.current];
      pendingQuoteSubmissions.current = []; // Clear pending
      
      if (submissions.length === 0) return;
      
      const firstSubmission = submissions[0];
      const recipientEmail = firstSubmission.shoot.approvalEmail || firstSubmission.shoot.requestor.email || DEFAULT_RECIPIENTS.approver;
      
      // Find emailThreadId from any shoot in the request group
      const requestGroupId = firstSubmission.shoot.requestGroupId;
      let threadMessageId: string | null = null;
      if (requestGroupId) {
        const groupShoot = shoots.find(s => s.requestGroupId === requestGroupId && s.emailThreadId);
        threadMessageId = groupShoot?.emailThreadId || null;
      } else {
        threadMessageId = firstSubmission.shoot.emailThreadId || null;
      }
      
      // Calculate combined total
      const totalQuoteAmount = submissions.reduce((sum, s) => sum + s.amount, 0);
      
      // Send ONE email for all quote submissions
      if (submissions.length === 1) {
        // Single shoot - use regular quoteSubmitted template
      triggerEmail(
          firstSubmission.shootId, 
          firstSubmission.shoot.name, 
        'quote_submitted', 
          recipientEmail,
          {
            quoteAmount: firstSubmission.amount,
            shoot: firstSubmission.shoot
          }
        );
      } else {
        // Multi-shoot - create combined email data
        const combinedShootData = {
          ...firstSubmission.shoot,
          name: `${submissions.length} Shoots Quote`,
          vendorQuote: { amount: totalQuoteAmount, notes: '' },
          shoots: submissions.map(s => ({
            name: s.shoot.name,
            date: s.shoot.date,
            equipment: s.shoot.equipment,
            vendorQuote: s.shoot.vendorQuote
          }))
        };
        
        triggerEmail(
          firstSubmission.shootId, 
          `${submissions.length} Shoots Quote`,
          'quote_submitted', 
        recipientEmail,
          {
            quoteAmount: totalQuoteAmount,
            shoot: combinedShootData
          }
        );
      }
      
      // Add activity to each shoot
      submissions.forEach(s => {
        addActivityToShoot(s.shootId, 'Quote Submitted', `Vendor submitted quote: ₹${s.amount.toLocaleString()}`);
      });
    }, 500); // Wait 500ms for all submissions to come in
    
    // Only redirect to dashboard if not in standalone vendor mode
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get('vendor')) {
    setViewMode('dashboard');
    }
  };

  const handleApprove = async (shootId: string) => {
    const shoot = shoots.find(s => s.id === shootId);
    if (!shoot) {
      console.error('Shoot not found:', shootId);
      throw new Error('Shoot not found');
    }
    
    const updatedShoot = { 
      ...shoot, 
            status: 'ready_for_shoot' as ShootStatus,
            approved: true,
      approvedAmount: shoot.vendorQuote?.amount
    };
    
    // Update local state first for immediate UI feedback
    setShoots(prev => prev.map(s => s.id === shootId ? updatedShoot : s));
    
    // Then save to API
    try {
      await saveShootToAPI(updatedShoot);
    } catch (error) {
      console.error('API save failed:', error);
    }
    
    // Send approval email via SMTP to requestor
      triggerEmail(
        shootId, 
        shoot.name, 
        'approved', 
      shoot.requestor.email || DEFAULT_RECIPIENTS.admin,
        {
          dates: shoot.date,
          location: shoot.location,
          quoteAmount: shoot.vendorQuote?.amount,
        shoot: updatedShoot
        }
      );
      
    addActivityToShoot(shootId, 'Quote Approved', `Approved by founder. Amount: ₹${shoot.vendorQuote?.amount?.toLocaleString()}`);
  };

  const handleReject = async (shootId: string, reason: string) => {
    const shoot = shoots.find(s => s.id === shootId);
    if (!shoot) {
      console.error('Shoot not found:', shootId);
      throw new Error('Shoot not found');
    }
    
    const updatedShoot = { 
      ...shoot, 
            status: 'with_vendor' as ShootStatus,
            rejectionReason: reason,
            vendorQuote: undefined
    };
    
    // Update local state first for immediate UI feedback
    setShoots(prev => prev.map(s => s.id === shootId ? updatedShoot : s));
    
    // Then save to API
    try {
      await saveShootToAPI(updatedShoot);
    } catch (error) {
      console.error('API save failed:', error);
    }
    
    // Send rejection email via SMTP with threading support
    triggerEmail(
      shootId,
      shoot.name,
      'rejected',
      shoot.requestor.email || DEFAULT_RECIPIENTS.admin,
      {
        shoot: { ...updatedShoot, rejectionReason: reason }
      }
    );
    
    addActivityToShoot(shootId, 'Quote Rejected', `Reason: ${reason}. Sent back to vendor for revision.`);
  };

  const handleUploadInvoice = async (shootId: string, fileName: string, fileData?: string) => {
    const shoot = shoots.find(s => s.id === shootId);
    if (!shoot) return;
    
    const updatedShoot = { 
      ...shoot,
            invoiceFile: {
              name: fileName,
        url: '#',
        data: fileData // Store base64 PDF data
      }
    };
    
    // Save to API first
    await saveShootToAPI(updatedShoot);
    
    setShoots(prev => prev.map(s => s.id === shootId ? updatedShoot : s));
    
    // Send invoice uploaded email via SMTP to finance
      triggerEmail(
        shootId, 
        shoot.name, 
        'invoice_uploaded', 
      DEFAULT_RECIPIENTS.finance,
      { shoot: updatedShoot }
      );
      
      addActivityToShoot(shootId, 'Invoice Uploaded', `File: ${fileName}`);
  };

  const handleMarkPaid = async (shootId: string) => {
    const shoot = shoots.find(s => s.id === shootId);
    if (!shoot) return;
    
    const updatedShoot = { 
      ...shoot, 
            status: 'completed' as ShootStatus,
            paid: true
    };
    
    // Save to API first
    await saveShootToAPI(updatedShoot);
    
    setShoots(prev => prev.map(s => s.id === shootId ? updatedShoot : s));
    
    // Send payment complete email via SMTP with threading support
    triggerEmail(
      shootId,
      shoot.name,
      'payment_complete',
      DEFAULT_RECIPIENTS.vendor, // Send to vendor
      {
        shoot: updatedShoot
      }
    );
    
    addActivityToShoot(shootId, 'Payment Completed', 'Invoice verified and payment processed');
    
    setSelectedShootId(null);
  };

  const handleOpenVendorLink = (shootId: string) => {
    setSelectedShootId(shootId);
    setViewMode('vendor');
  };

  const handleOpenInvoiceModal = (shootId: string) => {
    setSelectedShootId(shootId);
    setViewMode('invoice');
  };

  // Helper function to create a single shoot
  const createSingleShoot = (shootData: any, baseTimestamp: number): Shoot => {
    const nameParts = (shootData.requestorName || 'Unknown').split(' ');
    const avatar = nameParts.length >= 2 
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : nameParts[0].substring(0, 2).toUpperCase();

    const shootId = `${baseTimestamp}${shootData.multiShootIndex !== undefined ? `-${shootData.multiShootIndex}` : ''}`;
    
    return {
      id: shootId,
      name: shootData.shootName,
      date: `${new Date(shootData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(shootData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      duration: shootData.equipment.length > 0 ? `${shootData.equipment[0].days} Days` : '1 Day',
      location: shootData.location,
      equipment: shootData.equipment.map((item: any) => ({
        id: item.id,
        name: item.name,
        dailyRate: item.dailyRate || 0,
        quantity: item.quantity || 1,
        category: item.category,
        expectedRate: item.dailyRate || 0,
      })),
      status: 'new_request',
      requestor: {
        name: shootData.requestorName,
        avatar: avatar,
        email: shootData.requestorEmail || 'anish@company.com',
      },
      approvalEmail: shootData.approvalEmail,
      createdAt: new Date(),
      requestGroupId: shootData.requestGroupId,
      isMultiShoot: shootData.isMultiShoot || false,
      multiShootIndex: shootData.multiShootIndex,
      totalShootsInRequest: shootData.totalShootsInRequest,
      activities: [{
        id: '1',
        shootId,
        action: 'Request Created',
        description: `New equipment request created by ${shootData.requestorName}`,
        timestamp: new Date(),
        emailTriggered: true,
      }],
    };
  };

  const handleCreateRequest = async (requestData: any) => {
    const baseTimestamp = Date.now();
    
    // Check if this is a batch submission (multiple shoots)
    if (requestData.isMultiShootBatch && requestData.shoots) {
      console.log('Processing multi-shoot batch:', requestData.shoots.length, 'shoots with groupId:', requestData.requestGroupId);
      
      // Create all shoots at once
      const newShoots: Shoot[] = requestData.shoots.map((shootData: any, index: number) => {
        const shoot = createSingleShoot(shootData, baseTimestamp);
        console.log(`Created shoot ${index + 1}:`, shoot.name, 'id:', shoot.id, 'groupId:', shoot.requestGroupId);
        return shoot;
      });
      
      // Add all shoots to state at once
      setShoots(prev => {
        console.log('Adding', newShoots.length, 'shoots. Previous count:', prev.length);
        return [...newShoots, ...prev];
      });

      // Save all shoots to Supabase
      for (const shoot of newShoots) {
        await saveShootToAPI(shoot);
      }
      
      // Change view
      setViewMode('dashboard');
      
      // Trigger email for multi-shoot request
      const firstShoot = requestData.shoots[0];
      const secondShoot = requestData.shoots[1];
      
      // Format shoot data for email template
      const shootsForEmail = requestData.shoots.map((s: any) => ({
        name: s.shootName,
        date: `${new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(s.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        dates: `${new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(s.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        requestor: { name: s.requestorName || 'Pre-Production Team' },
        equipment: s.equipment.map((item: any) => ({
          name: item.name,
          dailyRate: item.dailyRate || 0,
          quantity: item.quantity || 1,
        })),
      }));
      
      setTimeout(() => {
        triggerEmail(
          newShoots[0].id, 
          `${firstShoot.shootName}${secondShoot ? ` & ${secondShoot.shootName}` : ''}`, 
          'new_request_multi', 
          firstShoot.approvalEmail || DEFAULT_RECIPIENTS.approver,
          {
            itemCount: requestData.shoots.reduce((sum: number, s: any) => sum + s.equipment.length, 0),
            estimatedBudget: requestData.shoots.reduce((sum: number, s: any) => sum + (s.totalBudget || 0), 0),
            requestorName: firstShoot.requestorName || 'Pre-Production Team',
            shoots: shootsForEmail,
          }
        );
      }, 300);
      
      return;
    }
    
    // Single shoot submission
    const newShoot = createSingleShoot(requestData, baseTimestamp);
    console.log('Creating single shoot:', newShoot.name, 'with groupId:', newShoot.requestGroupId, 'id:', newShoot.id);
    
    // Save to API first (await to ensure it completes)
    await saveShootToAPI(newShoot);
    
    // Then update local state
    setShoots(prev => [...[newShoot], ...prev]);
    
    // Change view first
    setViewMode('dashboard');
    
    // Trigger initial email notification with shoot details (with delay to ensure modal shows after view change)
    const dateStr = `${new Date(requestData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(requestData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    
    setTimeout(() => {
      triggerEmail(
        newShoot.id, 
        requestData.shootName, 
        'new_request', 
        requestData.approvalEmail || DEFAULT_RECIPIENTS.approver,
        {
          dates: dateStr,
          itemCount: requestData.equipment.length,
          estimatedBudget: requestData.totalBudget || 0,
          requestorName: requestData.requestorName || 'Pre-Production Team',
          equipmentList: requestData.equipment.map((item: any) => ({
            name: item.name,
            dailyRate: item.dailyRate || 0,
            quantity: item.quantity || 1,
          })),
          shoot: {
            ...newShoot,
            date: dateStr,
            dates: dateStr,
          }
        }
      );
    }, 300);
  };

  // Find selected shoot - check both by ID and by requestGroupId (for multi-shoot vendor links)
  const selectedShoot = shoots.find(s => s.id === selectedShootId) || 
                        shoots.find(s => s.requestGroupId === selectedShootId);
  
  // Debug: Log shoots with requestGroupId
  const shootsWithGroups = shoots.filter(s => s.requestGroupId);
  if (shootsWithGroups.length > 0) {
    console.log('Shoots with requestGroupId:', shootsWithGroups.map(s => ({ id: s.id, name: s.name, groupId: s.requestGroupId })));
  }
  if (selectedShoot) {
    console.log('Selected shoot:', selectedShoot.name, 'groupId:', selectedShoot.requestGroupId);
    const related = shoots.filter(s => s.requestGroupId === selectedShoot.requestGroupId && s.id !== selectedShoot.id);
    console.log('Related shoots:', related.map(s => s.name));
  }
  
  const pendingApprovals = shoots.filter(s => s.status === 'with_swati');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F7FA' }}>
      {viewMode === 'dashboard' && (
        <MainDashboard 
          shoots={shoots}
          onSendToVendor={handleSendToVendor}
          onOpenVendorLink={handleOpenVendorLink}
          onOpenApprovals={() => setViewMode('approval')}
          onOpenInvoice={handleOpenInvoiceModal}
          onOpenNewRequest={() => setViewMode('new_request')}
          onOpenFinance={() => setViewMode('finance')}
          onOpenCatalog={() => setViewMode('catalog')}
          onOpenArchive={() => setViewMode('archive')}
          // Auth props
          isAdmin={isAdmin}
          userName={user?.name}
          userEmail={user?.email}
          onLogout={logout}
          onEditShoot={(shootId) => {
            setSelectedShootId(shootId);
            setViewMode('edit_shoot');
          }}
        />
      )}
      
      {viewMode === 'vendor' && (
        isLoadingData ? (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading shoot data...</p>
            </div>
          </div>
        ) : selectedShoot ? (
        <VendorQuoteForm 
          shoot={selectedShoot}
          relatedShoots={
            selectedShoot.requestGroupId 
              ? shoots.filter(s => 
                  s.requestGroupId === selectedShoot.requestGroupId && 
                  s.id !== selectedShoot.id
                )
              : []
          }
          onSubmit={handleVendorSubmit}
          onBack={() => {
            setViewMode('dashboard');
            // Clear URL params when going back
            window.history.replaceState({}, '', window.location.pathname);
          }}
          isStandalone={!!vendorShootId}
        />
        ) : (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <p className="text-gray-600 text-lg">Shoot not found</p>
              <p className="text-gray-400 text-sm mt-2">This quote request may have expired or been removed.</p>
            </div>
          </div>
        )
      )}
      
      {viewMode === 'approval' && (
        <ApprovalScreen 
          shoots={pendingApprovals}
          allShoots={shoots}
          onApprove={handleApprove}
          onReject={handleReject}
          onBack={() => setViewMode('dashboard')}
          onOpenFinance={() => setViewMode('finance')}
          onOpenCatalog={() => setViewMode('catalog')}
          onOpenArchive={() => setViewMode('archive')}
          isAdmin={isAdmin}
        />
      )}
      
      {viewMode === 'invoice' && selectedShoot && (
        <InvoiceManagement 
          shoot={selectedShoot}
          onUploadInvoice={handleUploadInvoice}
          onMarkPaid={handleMarkPaid}
          onClose={() => {
            setViewMode('dashboard');
            setSelectedShootId(null);
          }}
        />
      )}

      {viewMode === 'new_request' && (
        <CreateRequestForm 
          catalogItems={catalogItems}
          onClose={() => setViewMode('dashboard')}
          onSubmit={handleCreateRequest}
          onAddCatalogItem={async (newItem) => {
            // Add to local state
            setCatalogItems(prev => [...prev, newItem]);
            // Save to API
            try {
              await saveCatalogItemToAPI(newItem);
              console.log('✅ New equipment saved to catalog:', newItem.name);
            } catch (error) {
              console.error('Failed to save equipment to API:', error);
            }
          }}
        />
      )}

      {viewMode === 'finance' && (
        <FinanceDashboard 
          shoots={shoots}
          onBack={() => setViewMode('dashboard')}
          onUploadInvoice={handleOpenInvoiceModal}
          onOpenApprovals={() => setViewMode('approval')}
          onOpenCatalog={() => setViewMode('catalog')}
          onOpenArchive={() => setViewMode('archive')}
        />
      )}

      {viewMode === 'catalog' && (
        <EquipmentCatalogManager 
          catalogItems={catalogItems}
          onUpdateCatalog={setCatalogItems}
          onBack={() => setViewMode('dashboard')}
          onOpenApprovals={() => setViewMode('approval')}
          onOpenFinance={() => setViewMode('finance')}
          onOpenArchive={() => setViewMode('archive')}
          approvalsPending={pendingApprovals.length}
        />
      )}

      {viewMode === 'archive' && (
        <ArchiveScreen 
          shoots={shoots}
          onBack={() => setViewMode('dashboard')}
          onOpenApprovals={() => setViewMode('approval')}
          onOpenFinance={() => setViewMode('finance')}
          onOpenCatalog={() => setViewMode('catalog')}
          approvalsPending={pendingApprovals.length}
        />
      )}

      {viewMode === 'edit_shoot' && selectedShoot && (
        <EditShootForm
          shoot={selectedShoot}
          relatedShoots={
            selectedShoot.requestGroupId 
              ? shoots.filter(s => 
                  s.requestGroupId === selectedShoot.requestGroupId && 
                  s.id !== selectedShoot.id
                )
              : []
          }
          catalogItems={catalogItems}
          onSave={async (shootId, updatedEquipment, updatedVendorQuote) => {
            const shoot = shoots.find(s => s.id === shootId);
            if (!shoot) return;
              
              const updates: Partial<Shoot> = { equipment: updatedEquipment };
              
              // Update vendor quote if provided
              if (updatedVendorQuote) {
                updates.vendorQuote = updatedVendorQuote;
                updates.approvedAmount = updatedVendorQuote.amount;
              }
              
            const updatedShoot = { ...shoot, ...updates };
            
            // Save to API first
            await saveShootToAPI(updatedShoot);
            
            setShoots(prev => prev.map(s => s.id === shootId ? updatedShoot : s));
            
            // Add activity for the edit
            const priceNote = updatedVendorQuote 
              ? ` New amount: ₹${updatedVendorQuote.amount.toLocaleString()}`
              : '';
            addActivityToShoot(shootId, 'Equipment Updated', `Equipment list modified by ${user?.name || 'Admin'}.${priceNote}`);
          }}
          onClose={() => {
            setViewMode('dashboard');
            setSelectedShootId(null);
          }}
        />
      )}

      {/* Notification Toasts */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toastNotifications.slice(0, 3).map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onDismiss={() => {
              setToastNotifications(prev => prev.filter(n => n.id !== notification.id));
            }}
            onView={() => {
              setSelectedEmailThread(notification);
              setToastNotifications(prev => prev.filter(n => n.id !== notification.id));
            }}
          />
        ))}
      </div>

      {/* Email Thread Modal */}
      {selectedEmailThread && (
        <EmailThreadModal
          notification={selectedEmailThread}
          onClose={() => setSelectedEmailThread(null)}
        />
      )}

      {/* Email Sent Modal - Shows when email is triggered */}
      {emailSentModal && (
        <EmailSentModal
          email={emailSentModal}
          onClose={() => setEmailSentModal(null)}
        />
      )}

    </div>
  );
}

// Main App component with AuthProvider wrapper
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;// Deploy Fri Dec 26 12:30:44 IST 2025
