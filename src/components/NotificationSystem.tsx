import { useState, useEffect } from 'react';
import { X, Mail, Bell, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'email' | 'system' | 'reminder';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  shootId?: string;
  shootName?: string;
  emailThread?: EmailMessage[];
}

export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: Date;
  type: 'sent' | 'received';
}

export interface Activity {
  id: string;
  shootId: string;
  action: string;
  description: string;
  timestamp: Date;
  user?: string;
  emailTriggered?: boolean;
}

interface NotificationSystemProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
  onViewThread: (notification: Notification) => void;
}

export function NotificationToast({ 
  notification, 
  onDismiss,
  onView 
}: { 
  notification: Notification; 
  onDismiss: () => void;
  onView: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const getIcon = () => {
    switch (notification.type) {
      case 'email':
        return <Mail className="w-5 h-5 text-blue-500" />;
      case 'reminder':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div 
      className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 max-w-sm animate-slide-in"
      style={{ animation: 'slideIn 0.3s ease-out' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
          <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
          {notification.type === 'email' && (
            <button 
              onClick={onView}
              className="text-sm text-blue-600 hover:text-blue-700 mt-2"
            >
              View Email Thread →
            </button>
          )}
        </div>
        <button 
          onClick={onDismiss}
          className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

export function EmailThreadModal({ 
  notification, 
  onClose 
}: { 
  notification: Notification; 
  onClose: () => void;
}) {
  if (!notification.emailThread) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white rounded-2xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)', width: '600px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
              <Mail className="w-5 h-5" style={{ color: '#2D60FF' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Email Thread</h2>
              <p className="text-sm text-gray-500">{notification.shootName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Email Thread */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-4">
            {notification.emailThread.map((email, index) => (
              <div 
                key={email.id}
                className={`p-4 rounded-xl ${
                  email.type === 'sent' 
                    ? 'bg-blue-50 ml-8' 
                    : 'bg-gray-50 mr-8'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{email.from}</span>
                    <span className="text-xs text-gray-400">→</span>
                    <span className="text-sm text-gray-600">{email.to}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {email.timestamp.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800 mb-1">{email.subject}</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{email.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Email Sent Modal - Shows immediately when an email is triggered
export function EmailSentModal({ 
  email, 
  onClose 
}: { 
  email: EmailMessage | null; 
  onClose: () => void;
}) {
  if (!email) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
      <div 
        className="bg-white rounded-2xl overflow-hidden flex flex-col animate-bounce-in"
        style={{ 
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)', 
          width: '550px',
          maxHeight: '85vh'
        }}
      >
        {/* Success Header */}
        <div 
          className="px-6 py-5 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
        >
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">✉️ Email Sent Successfully!</h2>
            <p className="text-green-100 text-sm">Notification delivered to recipient</p>
          </div>
        </div>

        {/* Email Preview */}
        <div className="flex-1 overflow-auto p-6">
          {/* Email Meta */}
          <div className="space-y-3 mb-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500 w-16">From:</span>
              <span className="text-sm text-gray-900">{email.from}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500 w-16">To:</span>
              <span className="text-sm text-gray-900 px-2 py-1 bg-blue-50 rounded">{email.to}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500 w-16">Subject:</span>
              <span className="text-sm font-semibold text-gray-900">{email.subject}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500 w-16">Time:</span>
              <span className="text-sm text-gray-600">{email.timestamp.toLocaleString()}</span>
            </div>
          </div>

          {/* Email Body */}
          <div 
            className="bg-gray-50 rounded-xl p-5 text-sm text-gray-700 whitespace-pre-line leading-relaxed"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {email.body}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-white font-medium transition-all hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  const getActivityIcon = (action: string) => {
    if (action.includes('email') || action.includes('Email')) {
      return <Mail className="w-4 h-4" />;
    }
    if (action.includes('approved') || action.includes('Approved')) {
      return <CheckCircle className="w-4 h-4" />;
    }
    if (action.includes('reminder') || action.includes('Reminder')) {
      return <AlertCircle className="w-4 h-4" />;
    }
    if (action.includes('invoice') || action.includes('Invoice')) {
      return <FileText className="w-4 h-4" />;
    }
    return <Clock className="w-4 h-4" />;
  };

  const getActivityColor = (action: string) => {
    if (action.includes('email') || action.includes('Email')) {
      return { bg: '#EFF6FF', color: '#2D60FF' };
    }
    if (action.includes('approved') || action.includes('Approved')) {
      return { bg: '#E8F5E9', color: '#27AE60' };
    }
    if (action.includes('reminder') || action.includes('Reminder')) {
      return { bg: '#FEF3E2', color: '#F2994A' };
    }
    if (action.includes('rejected') || action.includes('Rejected')) {
      return { bg: '#FEE2E2', color: '#DC2626' };
    }
    return { bg: '#F3F4F6', color: '#6B7280' };
  };

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => {
        const colors = getActivityColor(activity.action);
        return (
          <div key={activity.id} className="flex gap-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: colors.bg, color: colors.color }}
            >
              {getActivityIcon(activity.action)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{activity.action}</p>
              <p className="text-sm text-gray-500">{activity.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">
                  {activity.timestamp.toLocaleString()}
                </span>
                {activity.emailTriggered && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EFF6FF', color: '#2D60FF' }}>
                    Email sent
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

