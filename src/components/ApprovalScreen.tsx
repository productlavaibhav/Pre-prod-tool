import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  CheckCircle, 
  DollarSign, 
  Package, 
  Archive,
  X,
  Clock,
  XCircle,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import type { Shoot } from '../App';
import { useAuth } from '../context/AuthContext';

interface ApprovalScreenProps {
  shoots: Shoot[];
  allShoots: Shoot[];
  onApprove: (shootId: string) => Promise<void> | void;
  onReject: (shootId: string, reason: string) => Promise<void> | void;
  onBack: () => void;
  onOpenFinance: () => void;
  onOpenCatalog: () => void;
  onOpenArchive: () => void;
  isAdmin?: boolean;
}

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

export function ApprovalScreen({ shoots, allShoots, onApprove, onReject, onBack, onOpenFinance, onOpenCatalog, onOpenArchive, isAdmin = false }: ApprovalScreenProps) {
  const { user } = useAuth();
  const [filterTab, setFilterTab] = useState<FilterTab>('pending');
  const [selectedShoot, setSelectedShoot] = useState<Shoot | null>(null);
  const [relatedShoots, setRelatedShoots] = useState<Shoot[]>([]);
  const [activeShootIndex, setActiveShootIndex] = useState(0);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Get all shoots in the current group (for multi-shoot display)
  const groupedShoots = selectedShoot ? [selectedShoot, ...relatedShoots] : [];
  const isMultiShoot = groupedShoots.length > 1;
  const activeGroupShoot = groupedShoots[activeShootIndex] || selectedShoot;

  // Helper to open shoot details with related shoots
  const openShootDetails = (shoot: Shoot) => {
    setSelectedShoot(shoot);
    if (shoot.requestGroupId) {
      const related = allShoots.filter(s => 
        s.requestGroupId === shoot.requestGroupId && s.id !== shoot.id
      );
      setRelatedShoots(related);
    } else {
      setRelatedShoots([]);
    }
    setActiveShootIndex(0);
    setShowDetailsModal(true);
  };

  // Calculate counts with grouping
  const getGroupedCount = (shootList: Shoot[]): number => {
    const seenGroups = new Set<string>();
    let count = 0;
    shootList.forEach(shoot => {
      if (shoot.requestGroupId) {
        if (!seenGroups.has(shoot.requestGroupId)) {
          seenGroups.add(shoot.requestGroupId);
          count++;
        }
      } else {
        count++;
      }
    });
    return count;
  };
  
  const pendingCount = getGroupedCount(shoots);
  const approvedCount = getGroupedCount(allShoots.filter(s => s.approved && s.status !== 'with_swati'));
  const rejectedCount = getGroupedCount(allShoots.filter(s => s.rejectionReason));

  // Month name mappings
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const shortMonthMap: { [key: string]: number } = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

  // Group shoots by month
  const groupByMonth = (shootList: Shoot[]) => {
    const groups: { [key: string]: Shoot[] } = {};
    
    shootList.forEach(shoot => {
      const dateStr = shoot.date;
      let monthIndex = -1;
      let year = new Date().getFullYear();
      
      // Try to extract month from date string
      for (const [shortMonth, index] of Object.entries(shortMonthMap)) {
        if (dateStr.includes(shortMonth)) {
          monthIndex = index;
          break;
        }
      }
      
      // If shoot has shootDate, use that for accurate year
      if (shoot.shootDate) {
        const shootDateObj = new Date(shoot.shootDate);
        if (!isNaN(shootDateObj.getTime())) {
          monthIndex = shootDateObj.getMonth();
          year = shootDateObj.getFullYear();
        }
      }
      
      if (monthIndex === -1) monthIndex = new Date().getMonth();
      
      const monthKey = `${monthNames[monthIndex]} ${year}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(shoot);
    });
    
    return groups;
  };

  // Sort months chronologically
  const sortMonthsChronologically = (months: string[]) => {
    return months.sort((a, b) => {
      const [monthA, yearA] = a.split(' ');
      const [monthB, yearB] = b.split(' ');
      const indexA = monthNames.indexOf(monthA);
      const indexB = monthNames.indexOf(monthB);
      const yearDiff = parseInt(yearA) - parseInt(yearB);
      if (yearDiff !== 0) return yearDiff;
      return indexA - indexB;
    });
  };

  // Get filtered data based on tab - with grouping for multi-shoot requests
  const getFilteredData = () => {
    let filtered: Shoot[] = [];

    if (filterTab === 'pending') {
      filtered = shoots; // Only pending approvals
    } else if (filterTab === 'approved') {
      filtered = allShoots.filter(s => s.approved && s.status !== 'with_swati');
    } else if (filterTab === 'rejected') {
      filtered = allShoots.filter(s => s.rejectionReason);
    } else {
      // All - combine pending, approved, and rejected
      filtered = [
        ...shoots,
        ...allShoots.filter(s => s.approved && s.status !== 'with_swati'),
        ...allShoots.filter(s => s.rejectionReason)
      ];
      // Remove duplicates
      const seen = new Set();
      filtered = filtered.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
    }

    // Group multi-shoot requests - only show first shoot in each group
    const seenGroups = new Set<string>();
    const groupedFiltered = filtered.filter(shoot => {
      if (shoot.requestGroupId) {
        if (seenGroups.has(shoot.requestGroupId)) {
          return false; // Skip other shoots in the same group
        }
        seenGroups.add(shoot.requestGroupId);
      }
      return true;
    });

    return groupedFiltered;
  };
  
  // Get related shoots count for display
  const getRelatedShootsCount = (shoot: Shoot): number => {
    if (!shoot.requestGroupId) return 0;
    return allShoots.filter(s => s.requestGroupId === shoot.requestGroupId && s.id !== shoot.id).length;
  };

  const filteredData = getFilteredData();
  const groupedData = groupByMonth(filteredData);
  const monthOrder = sortMonthsChronologically(Object.keys(groupedData));

  const handleReject = () => {
    if (selectedShoot && rejectReason.trim()) {
      // Reject all shoots in the group
      if (isMultiShoot) {
        groupedShoots.forEach(shoot => {
          onReject(shoot.id, rejectReason);
        });
      } else {
      onReject(selectedShoot.id, rejectReason);
      }
      setShowRejectDialog(false);
      setShowDetailsModal(false);
      setRejectReason('');
      setSelectedShoot(null);
      setRelatedShoots([]);
      setActiveShootIndex(0);
    }
  };

  const [isApproving, setIsApproving] = useState(false);
  
  const handleApprove = async () => {
    if (selectedShoot && !isApproving) {
      setIsApproving(true);
      
      try {
        // Approve all shoots in the group
        if (isMultiShoot) {
          for (const shoot of groupedShoots) {
            await onApprove(shoot.id);
          }
        } else {
          await onApprove(selectedShoot.id);
        }
      } catch (error) {
        console.error('Approval error:', error);
      } finally {
        setIsApproving(false);
        setShowDetailsModal(false);
        setSelectedShoot(null);
        setRelatedShoots([]);
        setActiveShootIndex(0);
      }
    }
  };

  const openDetails = (shoot: Shoot) => {
    openShootDetails(shoot);
  };

  const getStatusBadge = (shoot: Shoot) => {
    if (shoot.status === 'with_swati' && !shoot.approved) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs"
          style={{ backgroundColor: '#FEF3E2', color: '#F2994A' }}
        >
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    } else if (shoot.approved) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs"
          style={{ backgroundColor: '#E8F5E9', color: '#27AE60' }}
        >
          <CheckCircle className="w-3 h-3" />
          Approved
        </span>
      );
    } else if (shoot.rejectionReason) {
    return (
        <span 
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs"
          style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
        >
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
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
            onClick={onBack}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-gray-700"
            style={{ color: '#9CA3AF' }}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Active Shoots</span>
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors relative"
            style={{ backgroundColor: '#2D60FF', color: 'white' }}
          >
            <CheckCircle className="w-5 h-5" />
            <span>Approvals</span>
            {pendingCount > 0 && (
              <span 
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{ backgroundColor: '#F2994A', color: 'white' }}
              >
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenFinance}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-gray-700"
            style={{ color: '#9CA3AF' }}
          >
            <DollarSign className="w-5 h-5" />
            <span>Finance & Invoices</span>
          </button>

          <button
            onClick={onOpenCatalog}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-gray-700"
            style={{ color: '#9CA3AF' }}
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
        <div className="px-4 py-6 border-t" style={{ borderColor: '#374151' }}>
          <div className="flex items-center gap-3 px-4">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: '#2D60FF' }}
            >
              {isAdmin ? 'A' : 'PT'}
            </div>
            <div>
              <div className="text-white text-sm">{isAdmin ? 'Admin' : 'Pre-production Team'}</div>
              <div className="text-gray-400 text-xs">{isAdmin ? 'Administrator' : 'Team Member'}</div>
            </div>
          </div>
            </div>
          </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-gray-900 text-2xl font-semibold">Approval Center</h1>
              <p className="text-gray-500 text-sm">Review and manage vendor quotes</p>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <div className="text-sm text-gray-500">Pending</div>
                <div className="text-xl font-semibold" style={{ color: '#F2994A' }}>{pendingCount}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Approved</div>
                <div className="text-xl font-semibold" style={{ color: '#27AE60' }}>{approvedCount}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Rejected</div>
                <div className="text-xl font-semibold" style={{ color: '#DC2626' }}>{rejectedCount}</div>
              </div>
            </div>
          </div>
                </div>

        {/* Filter Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFilterTab('all')}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: filterTab === 'all' ? '#EFF6FF' : 'transparent',
                color: filterTab === 'all' ? '#2D60FF' : '#6B7280'
              }}
            >
              All
            </button>
            <button
              onClick={() => setFilterTab('pending')}
              className="px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
              style={{
                backgroundColor: filterTab === 'pending' ? '#FEF3E2' : 'transparent',
                color: filterTab === 'pending' ? '#F2994A' : '#6B7280'
              }}
            >
              Pending Review
              {pendingCount > 0 && (
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                  style={{ backgroundColor: '#F2994A' }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterTab('approved')}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: filterTab === 'approved' ? '#E8F5E9' : 'transparent',
                color: filterTab === 'approved' ? '#27AE60' : '#6B7280'
              }}
            >
              Approved
            </button>
            <button
              onClick={() => setFilterTab('rejected')}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: filterTab === 'rejected' ? '#FEE2E2' : 'transparent',
                color: filterTab === 'rejected' ? '#DC2626' : '#6B7280'
              }}
            >
              Rejected
            </button>
            <div className="ml-auto text-sm text-gray-500">
              Sort by Month
            </div>
          </div>
        </div>

        {/* Approval Table (Grouped by Month) */}
        <div className="px-8 py-8">
          <div className="space-y-8">
            {monthOrder.map(month => {
              const monthData = groupedData[month];
              
              if (!monthData || monthData.length === 0) return null;
              
              return (
                <div key={month}>
                  {/* Group Header */}
                  <div className="mb-4">
                    <h3 className="text-gray-900 font-semibold">{month}</h3>
                  </div>

                  {/* Month Table */}
                  <div 
                    className="bg-white rounded-xl border border-gray-200"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Shoot Name</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Requestor</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Equipment</th>
                            {isAdmin && <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Quote Amount</th>}
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {monthData.map((shoot) => {
                            const relatedCount = getRelatedShootsCount(shoot);
                            return (
                            <tr key={shoot.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{shoot.name}</span>
                                  {relatedCount > 0 && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                      +{relatedCount} more
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">{shoot.location}</div>
                              </td>
                              <td className="px-6 py-4 text-gray-600">{shoot.date}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs"
                                    style={{ backgroundColor: '#2D60FF' }}
                                  >
                                    {shoot.requestor.avatar}
                                  </div>
                                  <span className="text-gray-700">{shoot.requestor.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                {shoot.equipment.length} items
                              </td>
                              {isAdmin && (
                                <td className="px-6 py-4">
                                  <span className="font-semibold" style={{ color: '#27AE60' }}>
                                    ₹{shoot.vendorQuote?.amount.toLocaleString() || 'N/A'}
                                  </span>
                                </td>
                              )}
                              <td className="px-6 py-4">
                                {getStatusBadge(shoot)}
                              </td>
                              <td className="px-6 py-4">
                                <button 
                                  onClick={() => openDetails(shoot)}
                                  className="flex items-center gap-2 px-3 py-1.5 border-2 rounded-lg text-sm transition-colors hover:bg-blue-50"
                                  style={{ borderColor: '#2D60FF', color: '#2D60FF' }}
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredData.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
                  <CheckCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg">No approvals found for the selected filter.</p>
                <p className="text-gray-400 text-sm mt-1">Try selecting a different filter to view approvals.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedShoot && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div 
            className="bg-white rounded-2xl flex flex-col my-4"
            style={{ 
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)', 
              width: isMultiShoot ? '600px' : '520px',
              maxWidth: '95vw',
              maxHeight: '90vh'
            }}
          >
            {/* Modal Header - Fixed */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {isMultiShoot ? 'Multi-Shoot Request' : activeGroupShoot?.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {isMultiShoot 
                    ? `${groupedShoots.length} shoots • ${activeGroupShoot?.date}`
                    : `${activeGroupShoot?.date} • ${activeGroupShoot?.location}`
                  }
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedShoot(null);
                  setRelatedShoots([]);
                  setActiveShootIndex(0);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Multi-shoot selector - Fixed */}
            {isMultiShoot && (
              <div className="border-b border-gray-200 flex-shrink-0">
                {/* Multi-shoot header banner */}
                <div className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{groupedShoots.length}</span>
                    </div>
                    <span className="text-white font-medium text-sm">Shoots in this request</span>
                  </div>
                </div>
                
                {/* Shoot tabs - Compact inline */}
                <div className="px-6 py-2 bg-gray-50">
                  <div className="flex gap-2">
                    {groupedShoots.map((shoot, index) => (
                      <button
                        key={shoot.id}
                        onClick={() => setActiveShootIndex(index)}
                        className={`flex-1 px-3 py-2 rounded-lg text-left transition-all border ${
                          activeShootIndex === index
                            ? 'bg-blue-500 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            activeShootIndex === index ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-sm truncate block">{shoot.name}</span>
                            <span className={`text-xs ${activeShootIndex === index ? 'text-blue-100' : 'text-gray-500'}`}>
                              ₹{shoot.vendorQuote?.amount?.toLocaleString() || 0}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(90vh - 280px)' }}>
              {/* Current shoot indicator for multi-shoot */}
              {isMultiShoot && (
                <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                      {activeShootIndex + 1}
                    </div>
                    <span className="font-medium text-blue-900 text-sm">
                      {activeGroupShoot?.name}
                    </span>
                    <span className="text-blue-600 text-xs ml-auto">
                      {activeGroupShoot?.location}
                    </span>
                  </div>
                </div>
              )}

              {/* Requestor Info */}
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1">Requested by</div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                    style={{ backgroundColor: '#2D60FF' }}
                  >
                    {activeGroupShoot?.requestor.avatar}
                  </div>
                  <span className="font-medium text-gray-900 text-sm">{activeGroupShoot?.requestor.name}</span>
                </div>
              </div>

              {/* Quote Summary */}
              <div className={`grid ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-3`}>
                {isAdmin && (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#F0FDF4' }}>
                    <div className="text-xs mb-1" style={{ color: '#27AE60' }}>Quote Amount</div>
                    <div className="text-xl font-bold" style={{ color: '#27AE60' }}>
                      ₹{activeGroupShoot?.vendorQuote?.amount.toLocaleString()}
                    </div>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-gray-50">
                  <div className="text-xs text-gray-500 mb-1">Equipment Items</div>
                  <div className="text-xl font-bold text-gray-900">{activeGroupShoot?.equipment.length} items</div>
                </div>
              </div>
              
              {/* Non-admin message */}
              {!isAdmin && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-700">Quote amounts are visible to admins only</span>
                </div>
              )}

              {/* Grand Total for multi-shoot */}
              {isMultiShoot && isAdmin && (
                <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-600 mb-1 font-medium">All Shoots Total</div>
                  <div className="space-y-0.5">
                    {groupedShoots.map((shoot, idx) => (
                      <div key={shoot.id} className="flex justify-between text-xs">
                        <span className={idx === activeShootIndex ? 'text-blue-600 font-medium' : 'text-gray-600'}>
                          {shoot.name}
                        </span>
                        <span className={idx === activeShootIndex ? 'text-blue-600 font-medium' : 'text-gray-900'}>
                          ₹{shoot.vendorQuote?.amount?.toLocaleString() || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1.5 pt-1.5 border-t border-blue-200">
                    <span className="font-semibold text-gray-900 text-sm">Grand Total</span>
                    <span className="text-lg font-bold text-blue-600">
                      ₹{groupedShoots.reduce((sum, s) => sum + (s.vendorQuote?.amount || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Equipment List - Clean View */}
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-700 mb-1.5">Equipment List</div>
                
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
                  {activeGroupShoot?.equipment.map((item) => {
                    const expectedPrice = (item.expectedRate || item.dailyRate || 0) * (item.quantity || 1);
                    const vendorPrice = item.vendorRate || 0;
                    const difference = vendorPrice - expectedPrice;
                    
                    return (
                      <div key={item.id} className="py-2 px-3 bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <span className="text-gray-900 text-xs">{item.name}</span>
                            {item.quantity && item.quantity > 1 && (
                              <span className="text-gray-500 text-xs ml-1">(x{item.quantity})</span>
                            )}
                          </div>
                          
                          {/* Vendor Price with Difference Below - Admin only */}
                          {isAdmin ? (
                            <div className="text-right flex-shrink-0 ml-2">
                              <div className="text-gray-900 text-xs font-medium">
                                ₹{vendorPrice.toLocaleString()}
                              </div>
                              {vendorPrice > 0 && expectedPrice > 0 && difference !== 0 && (
                                <div 
                                  className="text-xs"
                                  style={{ color: difference > 0 ? '#E74C3C' : '#27AE60' }}
                                >
                                  {difference > 0 ? '↑' : '↓'} ₹{Math.abs(difference).toLocaleString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-right flex-shrink-0 ml-2">
                              <div className="text-gray-400 text-xs">
                                <EyeOff className="w-3 h-3 inline" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Total Summary - Compact - Admin only */}
                {isAdmin && (() => {
                  const shoot = activeGroupShoot;
                  if (!shoot) return null;
                  const totalExpected = shoot.equipment.reduce((sum, item) => 
                    sum + ((item.expectedRate || item.dailyRate || 0) * (item.quantity || 1)), 0
                  );
                  const totalVendor = shoot.equipment.reduce((sum, item) => 
                    sum + (item.vendorRate || 0), 0
                  );
                  const totalDiff = totalVendor - totalExpected;
                  
                  return totalExpected > 0 && totalVendor > 0 ? (
                    <div className="mt-2 p-2 rounded-lg" style={{ 
                      backgroundColor: totalDiff > 0 ? '#FFEBEE' : totalDiff < 0 ? '#E8F5E9' : '#F9FAFB'
                    }}>
                      <div className="flex items-center justify-between">
                        <span 
                          className="text-xs font-medium"
                          style={{ color: totalDiff > 0 ? '#E74C3C' : totalDiff < 0 ? '#27AE60' : '#6B7280' }}
                        >
                          {totalDiff > 0 ? 'Over Budget' : totalDiff < 0 ? 'Under Budget' : 'On Budget'}
                        </span>
                        <span 
                          className="font-semibold text-sm"
                          style={{ color: totalDiff > 0 ? '#E74C3C' : totalDiff < 0 ? '#27AE60' : '#6B7280' }}
                        >
                          {totalDiff > 0 ? '+' : ''}₹{totalDiff.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Vendor Notes */}
              {activeGroupShoot?.vendorQuote?.notes && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-700 mb-1">Vendor Notes</div>
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-600 text-xs">
                    {activeGroupShoot.vendorQuote.notes}
              </div>
            </div>
          )}

              {/* Rejection Reason (if rejected) */}
              {activeGroupShoot?.rejectionReason && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-red-600 mb-1">Rejection Reason</div>
                  <div className="p-2 bg-red-50 rounded-lg text-red-700 text-xs">
                    {activeGroupShoot.rejectionReason}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer - Only show action buttons for pending approvals AND admin users */}
            {activeGroupShoot?.status === 'with_swati' && !activeGroupShoot?.approved && isAdmin && (
              <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0">
                {isMultiShoot && (
                  <div className="mb-2 text-center text-xs text-gray-500">
                    Applies to all {groupedShoots.length} shoots
                  </div>
                )}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowRejectDialog(true)}
                    className="px-5 py-2.5 rounded-lg border-2 text-red-600 hover:bg-red-50 transition-colors font-medium text-sm"
              style={{ borderColor: '#DC2626' }}
            >
                    Reject {isMultiShoot ? 'All' : 'Quote'}
            </button>
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="px-5 py-2.5 rounded-lg text-white transition-colors font-medium hover:opacity-90 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#27AE60' }}
            >
              {isApproving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Approving...
                </span>
              ) : (
                `Approve ${isMultiShoot ? 'All' : 'Quote'}`
              )}
            </button>
                </div>
              </div>
            )}
            
            {/* Non-admin pending approval message */}
            {activeGroupShoot?.status === 'with_swati' && !activeGroupShoot?.approved && !isAdmin && (
              <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0 bg-gray-50">
                <div className="text-center text-sm text-gray-600">
                  <Lock className="w-4 h-4 inline-block mr-1" />
                  Approval actions are available to admins only
                </div>
              </div>
            )}

            {/* Status badge for non-pending */}
            {(activeGroupShoot?.approved || activeGroupShoot?.rejectionReason) && (
              <div 
                className="px-6 py-4 border-t"
                style={{ 
                  backgroundColor: activeGroupShoot.approved ? '#F0FDF4' : '#FEE2E2',
                  borderColor: activeGroupShoot.approved ? '#27AE60' : '#DC2626'
                }}
              >
                <div 
                  className="flex items-center justify-center gap-2 font-medium"
                  style={{ color: activeGroupShoot.approved ? '#27AE60' : '#DC2626' }}
                >
                  {activeGroupShoot.approved ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>This quote has been approved</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      <span>This quote has been rejected</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && selectedShoot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Reject Quote</h3>
              <button 
                onClick={() => setShowRejectDialog(false)} 
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting the quote for <strong>{selectedShoot.name}</strong>:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectDialog(false)}
                className="flex-1 px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="flex-1 px-5 py-2.5 rounded-lg text-white disabled:opacity-50 font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: '#DC2626' }}
              >
                Reject Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
