import { Calendar, MapPin, Send, Bell, Upload } from 'lucide-react';
import type { Shoot } from '../App';

interface KanbanCardProps {
  shoot: Shoot;
  onAction: (shootId: string) => void;
  actionType: 'review' | 'remind' | 'upload' | 'none';
}

export function KanbanCard({ shoot, onAction, actionType }: KanbanCardProps) {
  const getStatusBadge = () => {
    const badges = {
      new_request: { label: 'New Request', color: '#F2994A' },
      with_vendor: { label: 'Wait for Vendor', color: '#F2994A' },
      with_swati: { label: 'Pending Approval', color: '#F2994A' },
      ready_for_shoot: { label: 'Ready', color: '#27AE60' },
      pending_invoice: { label: 'Awaiting Invoice', color: '#F2994A' },
      completed: { label: 'Completed', color: '#27AE60' },
    };

    const badge = badges[shoot.status];
    
    return (
      <span 
        className="text-xs px-2 py-1 rounded-full"
        style={{ 
          backgroundColor: `${badge.color}20`,
          color: badge.color 
        }}
      >
        {badge.label}
      </span>
    );
  };

  const getActionButton = () => {
    const buttons = {
      review: {
        label: 'Review List',
        icon: Send,
        color: '#2D60FF',
      },
      remind: {
        label: 'Remind Vendor',
        icon: Bell,
        color: '#64748B',
      },
      upload: {
        label: 'Upload Bill',
        icon: Upload,
        color: '#2D60FF',
      },
      none: null,
    };

    const button = buttons[actionType];
    if (!button) return null;

    const Icon = button.icon;

    return (
      <button
        onClick={() => onAction(shoot.id)}
        className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
        style={{
          color: button.color,
          backgroundColor: actionType === 'remind' ? 'transparent' : `${button.color}15`,
        }}
      >
        <Icon className="w-4 h-4" />
        {button.label}
      </button>
    );
  };

  const equipmentPreview = shoot.equipment.length > 3
    ? `${shoot.equipment[0].name} + ${shoot.equipment.length - 1} items...`
    : shoot.equipment.map(e => e.name).join(', ');

  return (
    <div 
      className="bg-white rounded-xl p-4 mb-3 cursor-pointer transition-all hover:shadow-md"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
    >
      {/* Header */}
      <div className="mb-3">
        <h3 className="mb-2">{shoot.name}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            {shoot.date}
          </div>
          {getStatusBadge()}
        </div>
      </div>

      {/* Body */}
      <div className="mb-3 pb-3 border-b border-gray-100">
        <div className="flex items-start gap-1 text-sm text-gray-600 mb-2">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{shoot.location}</span>
        </div>
        <p className="text-sm text-gray-500">{equipmentPreview}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
            style={{ 
              backgroundColor: '#EEF2FF',
              color: '#2D60FF'
            }}
          >
            {shoot.requestor.avatar}
          </div>
          <span className="text-sm text-gray-600">{shoot.requestor.name}</span>
        </div>
        {getActionButton()}
      </div>

      {shoot.vendorQuote && actionType !== 'upload' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Quote:</span>
            <span className="text-green-600">₹{shoot.vendorQuote.amount.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
