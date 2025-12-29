import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CheckCircle, 
  DollarSign, 
  Package, 
  Archive,
  Plus,
  Upload,
  X,
  Copy,
  Mail,
  Link,
  ExternalLink,
  LogOut,
  User,
  Shield,
  Edit3
} from 'lucide-react';
import type { Shoot } from '../App';

interface MainDashboardProps {
  shoots: Shoot[];
  onSendToVendor: (shootId: string) => void;
  onOpenVendorLink: (shootId: string) => void;
  onOpenApprovals: () => void;
  onOpenInvoice: (shootId: string) => void;
  onOpenNewRequest: () => void;
  onOpenFinance: () => void;
  onOpenCatalog: () => void;
  onOpenArchive: () => void;
  // Auth props
  isAdmin?: boolean;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  onEditShoot?: (shootId: string) => void;
}

type NavItem = 'active' | 'approvals' | 'finance' | 'catalog' | 'archive';
type FilterType = 'all' | 'new_request' | 'approvals_pending' | 'active_shoots' | 'pending_invoice';

export function MainDashboard({ 
  shoots, 
  onSendToVendor,
  onOpenInvoice,
  onOpenApprovals,
  onOpenVendorLink,
  onOpenNewRequest,
  onOpenFinance,
  onOpenCatalog,
  onOpenArchive,
  isAdmin = false,
  userName = 'User',
  userEmail = '',
  onLogout,
  onEditShoot
}: MainDashboardProps) {
  const [activeNav, setActiveNav] = useState<NavItem>('active');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [showSendToVendorModal, setShowSendToVendorModal] = useState(false);
  const [selectedShootForVendor, setSelectedShootForVendor] = useState<Shoot | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const openSendToVendorModal = (shoot: Shoot) => {
    setSelectedShootForVendor(shoot);
    setShowSendToVendorModal(true);
    setLinkCopied(false);
  };

  const handleCopyLink = () => {
    if (selectedShootForVendor) {
      const vendorLink = `${window.location.origin}?vendor=${selectedShootForVendor.id}`;
      navigator.clipboard.writeText(vendorLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleConfirmSendToVendor = () => {
    if (selectedShootForVendor) {
      onSendToVendor(selectedShootForVendor.id);
      setShowSendToVendorModal(false);
      setSelectedShootForVendor(null);
    }
  };

  // Helper to count unique request groups (multi-shoots count as 1)
  const getGroupedCountForStatus = (status: string) => {
    const filtered = shoots.filter(s => s.status === status);
    const groupIds = new Set<string>();
    let standaloneCount = 0;
    
    filtered.forEach(s => {
      if (s.requestGroupId) {
        groupIds.add(s.requestGroupId);
      } else {
        standaloneCount++;
      }
    });
    
    return groupIds.size + standaloneCount;
  };

  const approvalsPending = getGroupedCountForStatus('with_swati');

  // Count all active (non-completed) shoots - grouped
  const allActiveFiltered = shoots.filter(s => 
    s.status === 'pending_invoice' || 
    s.status === 'with_swati' || 
    s.status === 'with_vendor' ||
    s.status === 'new_request' ||
    s.status === 'ready_for_shoot'
  );
  const allActiveGroupIds = new Set<string>();
  let allActiveStandalone = 0;
  allActiveFiltered.forEach(s => {
    if (s.requestGroupId) {
      allActiveGroupIds.add(s.requestGroupId);
    } else {
      allActiveStandalone++;
    }
  });
  const allActiveCount = allActiveGroupIds.size + allActiveStandalone;

  const summaryCards = [
    { 
      id: 'all' as FilterType, 
      title: 'All', 
      count: allActiveCount,
      color: '#1F2937' 
    },
    { 
      id: 'new_request' as FilterType, 
      title: 'New Requests', 
      count: getGroupedCountForStatus('new_request'),
      color: '#2D60FF' 
    },
    { 
      id: 'approvals_pending' as FilterType, 
      title: 'Approvals Pending', 
      count: approvalsPending,
      color: '#F2994A' 
    },
    { 
      id: 'active_shoots' as FilterType, 
      title: 'Active Shoots', 
      count: getGroupedCountForStatus('ready_for_shoot'),
      color: '#27AE60' 
    },
    { 
      id: 'pending_invoice' as FilterType, 
      title: 'Pending Invoice', 
      count: getGroupedCountForStatus('pending_invoice'),
      color: '#9B51E0' 
    },
  ];

  // Group shoots by requestGroupId - multi-shoot requests appear as one row
  const groupShoots = (shootsList: Shoot[]): (Shoot & { groupedShoots?: Shoot[], shootCount?: number })[] => {
    const grouped: Map<string, Shoot[]> = new Map();
    const standalone: Shoot[] = [];
    
    shootsList.forEach(shoot => {
      if (shoot.requestGroupId) {
        const existing = grouped.get(shoot.requestGroupId) || [];
        existing.push(shoot);
        grouped.set(shoot.requestGroupId, existing);
      } else {
        standalone.push(shoot);
      }
    });
    
    // Convert grouped shoots to single representative entries
    const groupedEntries: (Shoot & { groupedShoots?: Shoot[], shootCount?: number })[] = [];
    grouped.forEach((groupShoots) => {
      // Use the first shoot as the representative, but include all shoots data
      const representative = { 
        ...groupShoots[0], 
        groupedShoots: groupShoots,
        shootCount: groupShoots.length 
      };
      groupedEntries.push(representative);
    });
    
    // Combine with standalone shoots
    return [...groupedEntries, ...standalone.map(s => ({ ...s, shootCount: 1 }))];
  };

  // Filter table data based on selected filter
  const getFilteredData = () => {
    let filtered: Shoot[] = [];
    
    if (selectedFilter === 'all') {
      filtered = shoots.filter(s => 
        s.status === 'pending_invoice' || 
        s.status === 'with_swati' || 
        s.status === 'with_vendor' ||
        s.status === 'new_request' ||
        s.status === 'ready_for_shoot'
      );
    } else if (selectedFilter === 'new_request') {
      filtered = shoots.filter(s => s.status === 'new_request');
    } else if (selectedFilter === 'approvals_pending') {
      filtered = shoots.filter(s => s.status === 'with_swati');
    } else if (selectedFilter === 'active_shoots') {
      filtered = shoots.filter(s => s.status === 'ready_for_shoot');
    } else if (selectedFilter === 'pending_invoice') {
      filtered = shoots.filter(s => s.status === 'pending_invoice');
    }
    
    // Group multi-shoot requests
    return groupShoots(filtered);
  };

  const tableData = getFilteredData();

  const getTableHeader = () => {
    if (selectedFilter === 'approvals_pending') return 'Requests Waiting for Approval';
    if (selectedFilter === 'new_request') return 'New Shoot Requests';
    if (selectedFilter === 'active_shoots') return 'Active Shoots';
    if (selectedFilter === 'pending_invoice') return 'Shoots Pending Invoice';
    return 'All Active Shoots';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_invoice':
        return { label: 'Shoot Completed', bg: '#F3E8FF', color: '#9B51E0' };
      case 'with_swati':
        return { label: 'Approval Pending', bg: '#FEF3E2', color: '#F2994A' };
      case 'with_vendor':
        return { label: 'Waiting for Quote', bg: '#F3F4F6', color: '#6B7280' };
      case 'new_request':
        return { label: 'New Request', bg: '#EFF6FF', color: '#2D60FF' };
      case 'ready_for_shoot':
        return { label: 'Active Shoot', bg: '#E8F5E9', color: '#27AE60' };
      default:
        return { label: status, bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  const getActionButton = (shoot: Shoot) => {
    if (shoot.status === 'pending_invoice') {
      return (
        <button
          onClick={() => onOpenInvoice(shoot.id)}
          className="px-4 py-2 rounded-lg border-2 transition-colors flex items-center gap-2 text-sm font-medium hover:bg-orange-50 whitespace-nowrap"
          style={{ borderColor: '#F2994A', color: '#F2994A' }}
        >
          <Upload className="w-4 h-4" />
          Upload Invoice
        </button>
      );
    }
    
    if (shoot.status === 'with_swati') {
      return (
        <button
          onClick={onOpenApprovals}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors hover:opacity-90 whitespace-nowrap"
          style={{ backgroundColor: '#2D60FF' }}
        >
          Review for Approval
        </button>
      );
    }
    
    if (shoot.status === 'with_vendor') {
      return (
        <button
          onClick={() => onOpenVendorLink(shoot.id)}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors hover:opacity-90 whitespace-nowrap"
          style={{ backgroundColor: '#2D60FF' }}
        >
          Send to Vendor
        </button>
      );
    }

    if (shoot.status === 'new_request') {
      return (
        <button
          onClick={() => onOpenVendorLink(shoot.id)}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors hover:opacity-90 whitespace-nowrap"
          style={{ backgroundColor: '#2D60FF' }}
        >
          Send to Vendor
        </button>
      );
    }

    if (shoot.status === 'ready_for_shoot') {
      return (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap" style={{ backgroundColor: '#E8F5E9', color: '#27AE60' }}>Active Shoot</span>
          {isAdmin && onEditShoot && (
            <button
              onClick={() => onEditShoot(shoot.id)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1 text-sm whitespace-nowrap"
              title="Edit shoot (Admin only)"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F5F7FA' }}>
      {/* Left Sidebar */}
      <div 
        className="w-64 flex flex-col"
        style={{ backgroundColor: '#1F2937' }}
      >
        {/* Logo/Brand */}
        <div className="px-6 py-6 border-b" style={{ borderColor: '#374151' }}>
          <h2 className="text-white text-xl">ShootFlow</h2>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button
            onClick={() => {
              setActiveNav('active');
              setSelectedFilter('all');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors"
            style={{
              backgroundColor: activeNav === 'active' ? '#2D60FF' : 'transparent',
              color: activeNav === 'active' ? 'white' : '#9CA3AF'
            }}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Active Shoots</span>
          </button>

          <button
            onClick={() => {
              setActiveNav('approvals');
              onOpenApprovals();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors relative"
            style={{
              backgroundColor: activeNav === 'approvals' ? '#2D60FF' : 'transparent',
              color: activeNav === 'approvals' ? 'white' : '#9CA3AF'
            }}
          >
            <CheckCircle className="w-5 h-5" />
            <span>Approvals</span>
            {approvalsPending > 0 && (
              <span 
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{ backgroundColor: '#F2994A', color: 'white' }}
              >
                {approvalsPending}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveNav('finance');
              onOpenFinance();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors"
            style={{
              backgroundColor: activeNav === 'finance' ? '#2D60FF' : 'transparent',
              color: activeNav === 'finance' ? 'white' : '#9CA3AF'
            }}
          >
            <DollarSign className="w-5 h-5" />
            <span>Finance & Invoices</span>
          </button>

          <button
            onClick={() => {
              setActiveNav('catalog');
              onOpenCatalog();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors"
            style={{
              backgroundColor: activeNav === 'catalog' ? '#2D60FF' : 'transparent',
              color: activeNav === 'catalog' ? 'white' : '#9CA3AF'
            }}
          >
            <Package className="w-5 h-5" />
            <span>Catalog</span>
          </button>

          <button
            onClick={onOpenArchive}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-gray-700"
            style={{ color: '#9CA3AF' }}
          >
            <Archive className="w-5 h-5" />
            <span>Archive</span>
          </button>
        </nav>

        {/* User Profile */}
        <div className="px-4 py-4 border-t" style={{ borderColor: '#374151' }}>
          <div className="flex items-center gap-3 px-2 mb-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: isAdmin ? '#8B5CF6' : '#2D60FF' }}
            >
              {isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white text-sm font-medium truncate">
                {isAdmin ? 'Admin' : 'Pre-production Team'}
              </div>
              <div className="text-gray-400 text-xs flex items-center gap-1">
                {isAdmin ? (
                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">Administrator</span>
                ) : (
                  <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">Team Member</span>
                )}
              </div>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-gray-900">Production Overview</h1>
              <p className="text-gray-500 text-sm">Manage your shoots and workflows</p>
            </div>
            <button
              onClick={onOpenNewRequest}
              className="px-5 py-2.5 rounded-lg text-white flex items-center gap-2 transition-colors font-medium hover:opacity-90"
              style={{ backgroundColor: '#2D60FF' }}
            >
              <Plus className="w-5 h-5" />
              New Shoot Request
            </button>
          </div>
        </div>

        {/* Summary Widgets */}
        <div className="px-8 py-8">
          <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
            {summaryCards.map((card) => {
              const isActive = selectedFilter === card.id;
              
              return (
                <button
                  key={card.id}
                  onClick={() => setSelectedFilter(card.id)}
                  className="bg-white rounded-xl p-6 text-left transition-all cursor-pointer"
                  style={{
                    border: isActive ? '2px solid #2D60FF' : '1px solid #E5E7EB',
                    boxShadow: isActive ? '0 4px 12px rgba(45, 96, 255, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <div className="text-sm text-gray-500 mb-2">{card.title}</div>
                  <div className="text-3xl" style={{ color: isActive ? '#2D60FF' : card.color }}>
                    {card.count}
                  </div>
                </button>
              );
            })}
          </div>

          {/* The Data Table */}
          <div 
            className="bg-white rounded-xl border border-gray-200"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-gray-900">{getTableHeader()}</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm text-gray-700 font-medium w-[30%]">Shoot Name</th>
                    {selectedFilter === 'approvals_pending' && (
                      <th className="px-6 py-3 text-left text-sm text-gray-700 font-medium w-[15%]">Vendor</th>
                    )}
                    <th className="px-6 py-3 text-left text-sm text-gray-700 font-medium w-[18%]">Dates</th>
                    {selectedFilter === 'approvals_pending' && (
                      <th className="px-6 py-3 text-left text-sm text-gray-700 font-medium w-[12%]">Total Quote</th>
                    )}
                    <th className="px-6 py-3 text-left text-sm text-gray-700 font-medium w-[15%]">Status</th>
                    <th className="px-6 py-3 text-left text-sm text-gray-700 font-medium w-[22%]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tableData.map((shoot) => {
                    const badge = getStatusBadge(shoot.status);
                    const shootCount = (shoot as any).shootCount || 1;
                    const isGrouped = shootCount > 1;
                    
                    return (
                      <tr key={shoot.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900">{shoot.name}</span>
                            {isGrouped && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                                +{shootCount - 1} more
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{shoot.location}</div>
                        </td>
                        {selectedFilter === 'approvals_pending' && (
                          <td className="px-6 py-4 text-gray-600">Gopala Media</td>
                        )}
                        <td className="px-6 py-4 text-gray-600">{shoot.date}</td>
                        {selectedFilter === 'approvals_pending' && (
                          <td className="px-6 py-4 text-gray-900">
                            ₹{shoot.vendorQuote?.amount.toLocaleString()}
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <span 
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                            style={{ backgroundColor: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {getActionButton(shoot)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {tableData.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No shoots in this category.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Send to Vendor Modal */}
      {showSendToVendorModal && selectedShootForVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div 
            className="bg-white rounded-2xl max-h-[85vh] overflow-hidden flex flex-col"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)', width: '500px' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Send to Vendor</h2>
                <p className="text-sm text-gray-500">Share equipment request with vendor</p>
              </div>
              <button
                onClick={() => {
                  setShowSendToVendorModal(false);
                  setSelectedShootForVendor(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto px-6 py-5">
              {/* Shoot Info */}
              <div className="p-4 rounded-xl bg-gray-50 mb-5">
                <div className="font-medium text-gray-900 mb-1">{selectedShootForVendor.name}</div>
                <div className="text-sm text-gray-500">{selectedShootForVendor.date} • {selectedShootForVendor.location}</div>
                <div className="text-sm text-gray-500 mt-2">{selectedShootForVendor.equipment.length} equipment items</div>
              </div>

              {/* Vendor Link */}
              <div className="mb-5">
                <div className="text-sm font-medium text-gray-700 mb-2">Vendor Quote Link</div>
                <div 
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200"
                  style={{ backgroundColor: '#F8FAFC' }}
                >
                  <div className="flex-1 flex items-center gap-2 overflow-hidden">
                    <Link className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-600 truncate">
                      {window.location.origin}?vendor={selectedShootForVendor.id}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 flex-shrink-0"
                    style={{ 
                      backgroundColor: linkCopied ? '#E8F5E9' : '#EFF6FF',
                      color: linkCopied ? '#27AE60' : '#2D60FF'
                    }}
                  >
                    <Copy className="w-4 h-4" />
                    {linkCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Equipment List */}
              <div className="mb-5">
                <div className="text-sm font-medium text-gray-700 mb-2">Equipment Requested</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedShootForVendor.equipment.map((item) => (
                    <div key={item.id} className="flex items-center py-2 px-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-900">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Note */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#EFF6FF' }}>
                <p className="text-sm" style={{ color: '#2D60FF' }}>
                  <strong>How it works:</strong> Share the vendor link with Gopala Media. They will fill out the quote form with pricing. Once submitted, you'll see it in the "Approvals Pending" section.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSendToVendorModal(false);
                    setSelectedShootForVendor(null);
                  }}
                  className="flex-1 px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSendToVendor}
                  className="flex-1 px-5 py-2.5 rounded-lg text-white transition-colors font-medium flex items-center justify-center gap-2 hover:opacity-90"
                  style={{ backgroundColor: '#2D60FF' }}
                >
                  <Mail className="w-4 h-4" />
                  Confirm & Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
