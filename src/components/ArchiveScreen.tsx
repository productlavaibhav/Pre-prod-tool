import { useState } from 'react';
import { 
  LayoutDashboard, 
  CheckCircle, 
  DollarSign, 
  Package, 
  Archive,
  XCircle,
  AlertCircle,
  Eye,
  X,
  Trash2,
  RotateCcw
} from 'lucide-react';
import type { Shoot } from '../App';
import { useAuth } from '../context/AuthContext';

interface ArchiveScreenProps {
  shoots: Shoot[];
  onBack: () => void;
  onOpenApprovals: () => void;
  onOpenFinance: () => void;
  onOpenCatalog: () => void;
  onRestoreShoot?: (shootId: string) => void;
  onDeletePermanently?: (shootId: string) => void;
  approvalsPending?: number;
}

type FilterTab = 'all' | 'rejected' | 'cancelled';

export function ArchiveScreen({ 
  shoots, 
  onBack, 
  onOpenApprovals, 
  onOpenFinance, 
  onOpenCatalog,
  onRestoreShoot,
  onDeletePermanently,
  approvalsPending = 0
}: ArchiveScreenProps) {
  const { isAdmin } = useAuth();
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [selectedShoot, setSelectedShoot] = useState<Shoot | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Get archived shoots (rejected or cancelled)
  const archivedShoots = shoots.filter(s => s.rejectionReason || s.status === 'cancelled');
  
  const rejectedCount = shoots.filter(s => s.rejectionReason).length;
  const cancelledCount = shoots.filter(s => s.status === 'cancelled').length;

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

  // Get filtered data based on tab
  const getFilteredData = () => {
    if (filterTab === 'rejected') {
      return shoots.filter(s => s.rejectionReason);
    } else if (filterTab === 'cancelled') {
      return shoots.filter(s => s.status === 'cancelled');
    }
    return archivedShoots;
  };

  const filteredData = getFilteredData();
  const groupedData = groupByMonth(filteredData);
  const monthOrder = sortMonthsChronologically(Object.keys(groupedData));

  const openDetails = (shoot: Shoot) => {
    setSelectedShoot(shoot);
    setShowDetailsModal(true);
  };

  const getArchiveReason = (shoot: Shoot) => {
    if (shoot.rejectionReason) {
      return { type: 'Rejected', reason: shoot.rejectionReason };
    }
    if (shoot.status === 'cancelled') {
      return { type: 'Cancelled', reason: shoot.cancellationReason || 'No reason provided' };
    }
    return { type: 'Unknown', reason: '' };
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
            onClick={onOpenApprovals}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors relative hover:bg-gray-700"
            style={{ color: '#9CA3AF' }}
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
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors"
            style={{ backgroundColor: '#2D60FF', color: 'white' }}
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
              <h1 className="text-gray-900 text-2xl font-semibold">Archive</h1>
              <p className="text-gray-500 text-sm">Rejected and cancelled shoots</p>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <div className="text-sm text-gray-500">Rejected</div>
                <div className="text-xl font-semibold" style={{ color: '#DC2626' }}>{rejectedCount}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Cancelled</div>
                <div className="text-xl font-semibold" style={{ color: '#6B7280' }}>{cancelledCount}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Total Archived</div>
                <div className="text-xl font-semibold" style={{ color: '#1F2937' }}>{archivedShoots.length}</div>
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
                backgroundColor: filterTab === 'all' ? '#F3F4F6' : 'transparent',
                color: filterTab === 'all' ? '#1F2937' : '#6B7280'
              }}
            >
              All Archived
            </button>
            <button
              onClick={() => setFilterTab('rejected')}
              className="px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
              style={{
                backgroundColor: filterTab === 'rejected' ? '#FEE2E2' : 'transparent',
                color: filterTab === 'rejected' ? '#DC2626' : '#6B7280'
              }}
            >
              <XCircle className="w-4 h-4" />
              Rejected
              {rejectedCount > 0 && (
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                  style={{ backgroundColor: '#DC2626' }}
                >
                  {rejectedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterTab('cancelled')}
              className="px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
              style={{
                backgroundColor: filterTab === 'cancelled' ? '#F3F4F6' : 'transparent',
                color: filterTab === 'cancelled' ? '#6B7280' : '#6B7280'
              }}
            >
              <AlertCircle className="w-4 h-4" />
              Cancelled
            </button>
            <div className="ml-auto text-sm text-gray-500">
              Sort by Month
            </div>
          </div>
        </div>

        {/* Archive Table (Grouped by Month) */}
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
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Reason</th>
                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {monthData.map((shoot) => {
                            const archiveInfo = getArchiveReason(shoot);
                            return (
                              <tr key={shoot.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-medium text-gray-900">{shoot.name}</div>
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
                                <td className="px-6 py-4">
                                  {archiveInfo.type === 'Rejected' ? (
                                    <span 
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs"
                                      style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
                                    >
                                      <XCircle className="w-3 h-3" />
                                      Rejected
                                    </span>
                                  ) : (
                                    <span 
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs"
                                      style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                                    >
                                      <AlertCircle className="w-3 h-3" />
                                      Cancelled
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-gray-600 text-sm max-w-xs truncate">
                                  {archiveInfo.reason}
                                </td>
                                <td className="px-6 py-4">
                                  <button 
                                    onClick={() => openDetails(shoot)}
                                    className="flex items-center gap-2 px-3 py-1.5 border-2 rounded-lg text-sm transition-colors hover:bg-gray-50"
                                    style={{ borderColor: '#6B7280', color: '#6B7280' }}
                                  >
                                    <Eye className="w-4 h-4" />
                                    View
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
                  <Archive className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg">No archived shoots</p>
                <p className="text-gray-400 text-sm mt-1">Rejected and cancelled shoots will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedShoot && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div 
            className="bg-white rounded-2xl max-h-[85vh] overflow-hidden flex flex-col"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)', width: '520px' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedShoot.name}</h2>
                <p className="text-sm text-gray-500">{selectedShoot.date} • {selectedShoot.location}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedShoot(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto px-6 py-5">
              {/* Status Badge */}
              <div className="mb-5">
                {getArchiveReason(selectedShoot).type === 'Rejected' ? (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#FEE2E2' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5" style={{ color: '#DC2626' }} />
                      <span className="font-medium" style={{ color: '#DC2626' }}>Quote Rejected</span>
                    </div>
                    <p className="text-sm" style={{ color: '#991B1B' }}>
                      {selectedShoot.rejectionReason}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-700">Shoot Cancelled</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {selectedShoot.cancellationReason || 'No reason provided'}
                    </p>
                  </div>
                )}
              </div>

              {/* Requestor Info */}
              <div className="mb-5">
                <div className="text-sm text-gray-500 mb-2">Requested by</div>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: '#2D60FF' }}
                  >
                    {selectedShoot.requestor.avatar}
                  </div>
                  <span className="font-medium text-gray-900">{selectedShoot.requestor.name}</span>
                </div>
              </div>

              {/* Quote Info (if exists) */}
              {selectedShoot.vendorQuote && (
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="p-4 rounded-xl bg-gray-50">
                    <div className="text-sm text-gray-500 mb-1">Quote Amount</div>
                    <div className="text-xl font-bold text-gray-900">
                      ₹{selectedShoot.vendorQuote.amount.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50">
                    <div className="text-sm text-gray-500 mb-1">Equipment Items</div>
                    <div className="text-xl font-bold text-gray-900">{selectedShoot.equipment.length} items</div>
                  </div>
                </div>
              )}

              {/* Equipment List */}
              <div className="mb-5">
                <div className="text-sm font-medium text-gray-700 mb-2">Equipment List</div>
                <div className="space-y-2">
                  {selectedShoot.equipment.map((item) => (
                    <div key={item.id} className="flex items-center py-2.5 px-4 bg-gray-50 rounded-lg">
                      <span className="text-gray-900">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vendor Notes */}
              {selectedShoot.vendorQuote?.notes && (
                <div className="mb-5">
                  <div className="text-sm font-medium text-gray-700 mb-2">Vendor Notes</div>
                  <div className="p-4 bg-gray-50 rounded-lg text-gray-600">
                    {selectedShoot.vendorQuote.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100">
              <div className="flex gap-3">
                {onRestoreShoot && (
                  <button
                    onClick={() => {
                      onRestoreShoot(selectedShoot.id);
                      setShowDetailsModal(false);
                      setSelectedShoot(null);
                    }}
                    className="flex-1 py-3 rounded-lg border-2 transition-colors font-medium flex items-center justify-center gap-2 hover:bg-blue-50"
                    style={{ borderColor: '#2D60FF', color: '#2D60FF' }}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore Shoot
                  </button>
                )}
                {onDeletePermanently && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to permanently delete this shoot?')) {
                        onDeletePermanently(selectedShoot.id);
                        setShowDetailsModal(false);
                        setSelectedShoot(null);
                      }
                    }}
                    className="flex-1 py-3 rounded-lg border-2 transition-colors font-medium flex items-center justify-center gap-2 hover:bg-red-50"
                    style={{ borderColor: '#DC2626', color: '#DC2626' }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Permanently
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

