import { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  CheckCircle, 
  DollarSign, 
  Package, 
  Archive,
  FileText, 
  Upload,
  X,
  Download,
  ChevronDown,
  ChevronRight,
  Calendar,
  TrendingUp,
  BarChart3,
  List
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import type { Shoot } from '../App';
import { useAuth } from '../context/AuthContext';

interface FinanceDashboardProps {
  shoots: Shoot[];
  onBack: () => void;
  onUploadInvoice: (shootId: string) => void;
  onOpenApprovals: () => void;
  onOpenCatalog: () => void;
  onOpenArchive: () => void;
}

type FilterTab = 'all' | 'paid' | 'pending';
type ViewMode = 'list' | 'chart';
type ChartView = 'monthly' | 'daily';

export function FinanceDashboard({ shoots, onBack, onUploadInvoice, onOpenApprovals, onOpenCatalog, onOpenArchive }: FinanceDashboardProps) {
  // Debug log
  console.log('📊 FinanceDashboard received', shoots?.length || 0, 'shoots');
  
  const { isAdmin } = useAuth();
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Shoot | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [chartView, setChartView] = useState<ChartView>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<string>('');
  const [selectedEndDate, setSelectedEndDate] = useState<string>('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [selectedMonthStart, setSelectedMonthStart] = useState<string>('');
  const [selectedMonthEnd, setSelectedMonthEnd] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const approvalsPending = shoots.filter(s => s.status === 'with_swati').length;

  const openPdfViewer = (shoot: Shoot) => {
    setSelectedInvoice(shoot);
    setShowPdfModal(true);
  };

  // Month name mappings
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Helper to safely parse amount as number
  const parseAmount = (shoot: Shoot): number => {
    // Try approved amount first, then vendor quote
    let amount = shoot.approvedAmount ?? shoot.vendorQuote?.amount ?? 0;
    
    // Handle string amounts (from database)
    if (typeof amount === 'string') {
      // Remove any non-numeric characters except decimal point
      const cleaned = amount.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    // Ensure it's a valid number
    const num = Number(amount);
    return isNaN(num) ? 0 : num;
  };

  // Parse date and get month/year
  const getMonthYear = (shoot: Shoot): { month: number; year: number; day: number } => {
    const dateStr = shoot.date;
    
    if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return { month: month - 1, year, day };
    }
    
    if (shoot.shootDate) {
      const d = new Date(shoot.shootDate);
      if (!isNaN(d.getTime())) {
        return { month: d.getMonth(), year: d.getFullYear(), day: d.getDate() };
      }
    }
    
    for (let i = 0; i < shortMonthNames.length; i++) {
      if (dateStr?.includes(shortMonthNames[i])) {
        return { month: i, year: new Date().getFullYear(), day: 1 };
      }
    }
    
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear(), day: now.getDate() };
  };

  // Group shoots by month
  const groupByMonth = (shootList: Shoot[]) => {
    const groups: { [key: string]: Shoot[] } = {};
    
    shootList.forEach(shoot => {
      const { month, year } = getMonthYear(shoot);
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(shoot);
    });
    
    return groups;
  };

  // Helper to get shoot date as Date object - aligned with getMonthYear
  const getShootDateObj = (shoot: any): Date | null => {
    const dateStr = shoot.date;
    
    // Try YYYY-MM-DD format first (this is how data is stored)
    if (dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    
    // Try shootDate field
    if (shoot.shootDate) {
      const d = new Date(shoot.shootDate);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
    
    // Try shootDates array
    if (shoot.shootDates?.[0]) {
      const d = new Date(shoot.shootDates[0]);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
    
    // Fallback: use getMonthYear to construct date
    const { month, year, day } = getMonthYear(shoot);
    return new Date(year, month, day);
  };

  // Filter invoice data
  const getInvoiceData = () => {
    let filtered = shoots.filter(s => 
      s.status === 'pending_invoice' || 
      s.status === 'completed' || 
      s.paid
    );

    if (filterTab === 'paid') {
      filtered = filtered.filter(s => s.paid);
    } else if (filterTab === 'pending') {
      filtered = filtered.filter(s => !s.paid);
    }

    // Apply date range filter
    if (filterStartDate && filterEndDate) {
      const startDate = new Date(filterStartDate);
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999); // Include full end date
      
      filtered = filtered.filter(s => {
        const shootDate = getShootDateObj(s);
        return shootDate && shootDate >= startDate && shootDate <= endDate;
      });
    }

    return filtered.map(shoot => ({
      ...shoot,
      vendor: 'Gopala Digital World',
      amount: parseAmount(shoot),
    }));
  };

  const invoiceData = getInvoiceData();
  const groupedInvoices = groupByMonth(invoiceData);
  const monthOrder = Object.keys(groupedInvoices).sort((a, b) => a.localeCompare(b));

  // Calculate totals - explicitly ensure numeric addition
  const totalPaid = shoots.filter(s => s.paid).reduce((sum: number, s) => {
    return Number(sum) + parseAmount(s);
  }, 0);
  const totalPending = shoots.filter(s => !s.paid && (s.status === 'pending_invoice' || s.status === 'completed')).reduce((sum: number, s) => {
    return Number(sum) + parseAmount(s);
  }, 0);
  const totalShoots = invoiceData.length;

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const toggleInvoice = (invoiceId: string) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
    }
    setExpandedInvoices(newExpanded);
  };

  const formatMonthKey = (key: string) => {
    const [year, month] = key.split('-');
    return `${monthNames[parseInt(month)]} ${year}`;
  };

  const formatShortMonth = (key: string) => {
    const [, month] = key.split('-');
    return shortMonthNames[parseInt(month)];
  };

  const getMonthTotal = (monthShoots: Shoot[]) => {
    return monthShoots.reduce((sum: number, s) => Number(sum) + parseAmount(s), 0);
  };

  const getMonthPaidCount = (monthShoots: Shoot[]) => {
    return monthShoots.filter(s => s.paid).length;
  };

  // Chart data
  const chartData = useMemo(() => {
    if (chartView === 'monthly') {
      // Filter months based on selection
      let filteredMonths = [...monthOrder];
      
      if (selectedMonthStart || selectedMonthEnd) {
        const startIdx = selectedMonthStart ? monthOrder.indexOf(selectedMonthStart) : 0;
        const endIdx = selectedMonthEnd ? monthOrder.indexOf(selectedMonthEnd) : monthOrder.length - 1;
        
        if (startIdx !== -1 && endIdx !== -1) {
          filteredMonths = monthOrder.filter((_, idx) => idx >= startIdx && idx <= endIdx);
        }
      }
      
      const data = filteredMonths.map(monthKey => {
        const monthShoots = groupedInvoices[monthKey] || [];
        const total = getMonthTotal(monthShoots);
        const shootNames = monthShoots.map(s => s.title || s.name || 'Unnamed Shoot');
        return {
          name: formatShortMonth(monthKey),
          fullName: formatMonthKey(monthKey),
          monthKey,
          amount: total,
          shoots: monthShoots.length,
          shootNames,
        };
      });
      return data;
    } else {
      // Daily/Weekly view with date range
      if (!selectedStartDate || !selectedEndDate) return [];
      
      // Parse dates avoiding timezone issues (YYYY-MM-DD format from input)
      const [startYear, startMonth, startDay] = selectedStartDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = selectedEndDate.split('-').map(Number);
      const startDate = new Date(startYear, startMonth - 1, startDay);
      const endDate = new Date(endYear, endMonth - 1, endDay);
      
      // Filter shoots within date range
      const filteredShoots = invoiceData.filter(shoot => {
        const shootDate = getShootDateObj(shoot);
        if (!shootDate) return false;
        
        // Compare using date strings to avoid timezone issues
        const shootDateOnly = new Date(shootDate.getFullYear(), shootDate.getMonth(), shootDate.getDate());
        return shootDateOnly >= startDate && shootDateOnly <= endDate;
      });
      
      // Group by day using local date key
      const dailyData: { [key: string]: { amount: number; shoots: number; date: Date; shootNames: string[] } } = {};
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      filteredShoots.forEach(shoot => {
        const shootDate = getShootDateObj(shoot);
        if (!shootDate) return;
        
        // Use local date for key
        const dateKey = `${shootDate.getFullYear()}-${String(shootDate.getMonth() + 1).padStart(2, '0')}-${String(shootDate.getDate()).padStart(2, '0')}`;
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { amount: 0, shoots: 0, date: shootDate, shootNames: [] };
        }
        dailyData[dateKey].amount = Number(dailyData[dateKey].amount) + parseAmount(shoot);
        dailyData[dateKey].shoots += 1;
        dailyData[dateKey].shootNames.push(shoot.title || shoot.name || 'Unnamed Shoot');
      });
      
      // Generate all days in range for continuous line
      const allDays: { name: string; fullName: string; amount: number; shoots: number; shootNames: string[] }[] = [];
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        const dayName = dayNames[current.getDay()];
        const dayNum = current.getDate();
        const monthName = shortMonthNames[current.getMonth() + 1];
        
        allDays.push({
          name: `${dayNum}`,
          fullName: `${dayName}, ${monthName} ${dayNum}`,
          amount: dailyData[dateKey]?.amount || 0,
          shoots: dailyData[dateKey]?.shoots || 0,
          shootNames: dailyData[dateKey]?.shootNames || [],
        });
        current.setDate(current.getDate() + 1);
      }
      
      return allDays;
    }
  }, [chartView, selectedStartDate, selectedEndDate, selectedMonthStart, selectedMonthEnd, invoiceData, groupedInvoices, monthOrder]);

  // Helper to infer category from equipment name
  const inferCategory = (name: string, existingCategory?: string): string => {
    if (existingCategory && existingCategory !== 'Other' && existingCategory !== 'NoCategory' && existingCategory !== 'Extra') {
      return existingCategory;
    }
    const nameLower = (name || '').toLowerCase();
    
    // Camera - cameras and action cameras
    if (nameLower.includes('camera') || nameLower.includes('sony') || nameLower.includes('canon') || 
        nameLower.includes('a7') || nameLower.includes('fx3') || nameLower.includes('gopro') || 
        nameLower.includes('red ') || nameLower.includes('arri') || nameLower.includes('blackmagic') ||
        nameLower.includes('bmpcc') || nameLower.includes('hero')) return 'Camera';
    
    // Light - all lighting equipment
    if (nameLower.includes('light') || nameLower.includes('led') || nameLower.includes('aputure') || 
        nameLower.includes('godox') || nameLower.includes('amaran') || nameLower.includes('softbox') ||
        nameLower.includes('nanlite') || nameLower.includes('chimera') || nameLower.includes('diffuser') ||
        nameLower.includes('reflector') || nameLower.includes('scrim') || nameLower.includes('silk')) return 'Light';
    
    // Lens
    if (nameLower.includes('lens') || nameLower.includes('gm') || nameLower.includes('prime') ||
        nameLower.includes('zoom') || nameLower.includes('sigma') || nameLower.includes('zeiss') ||
        nameLower.includes('nd filter') || nameLower.includes('filter')) return 'Lens';
    
    // Tripod & Support
    if (nameLower.includes('tripod') || nameLower.includes('monopod') || nameLower.includes('gimbal') || 
        nameLower.includes('slider') || nameLower.includes('dolly') || nameLower.includes('jib') ||
        nameLower.includes('steadicam') || nameLower.includes('stabilizer')) return 'Tripod';
    
    // Audio
    if (nameLower.includes('mic') || nameLower.includes('audio') || nameLower.includes('rode') || 
        nameLower.includes('wireless') || nameLower.includes('lav') || nameLower.includes('boom') ||
        nameLower.includes('recorder') || nameLower.includes('sound') || nameLower.includes('sennheiser')) return 'Audio';
    
    // Gaffer & Grip
    if (nameLower.includes('gaffer') || nameLower.includes('grip') || nameLower.includes('c-stand') || 
        nameLower.includes('flag') || nameLower.includes('frame') || nameLower.includes('cloth') ||
        nameLower.includes('black cloth') || nameLower.includes('sandbag') || nameLower.includes('clamp') ||
        nameLower.includes('magic arm') || nameLower.includes('arm')) return 'Gaffer';
    
    // Transport
    if (nameLower.includes('transport') || nameLower.includes('vehicle') || nameLower.includes('car') ||
        nameLower.includes('travel') || nameLower.includes('cab')) return 'Transport';
    
    // Assistant / Crew
    if (nameLower.includes('assistant') || nameLower.includes('operator') || nameLower.includes('dop') ||
        nameLower.includes('crew') || nameLower.includes('technician') || nameLower.includes('teleprompter')) return 'Assistant';
    
    // Small Equipment / Accessories
    if (nameLower.includes('monitor') || nameLower.includes('ssd') || nameLower.includes('card') ||
        nameLower.includes('battery') || nameLower.includes('charger') || nameLower.includes('cable') ||
        nameLower.includes('accessor')) return 'Small Equipments';
    
    return 'Other';
  };

  // Category spending data for pie chart - uses the same total as the monthly chart
  const categorySpendingData = useMemo(() => {
    const categoryTotals: { [key: string]: { value: number; count: number } } = {};
    
    // Use the SAME shoots that chartData uses for consistency
    // chartData uses all invoiceData grouped by month, so we use invoiceData directly
    let shootsToAnalyze = [...invoiceData];
    
    // If daily view with date range, filter to match
    if (chartView === 'daily' && selectedStartDate && selectedEndDate) {
      const startDate = new Date(selectedStartDate);
      const endDate = new Date(selectedEndDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      shootsToAnalyze = shootsToAnalyze.filter(invoice => {
        const shootDate = getShootDateObj(invoice);
        return shootDate && shootDate >= startDate && shootDate <= endDate;
      });
    }
    
    // If month range is selected, filter to match
    if (chartView === 'monthly' && (selectedMonthStart || selectedMonthEnd)) {
      const startIdx = selectedMonthStart ? monthOrder.indexOf(selectedMonthStart) : 0;
      const endIdx = selectedMonthEnd ? monthOrder.indexOf(selectedMonthEnd) : monthOrder.length - 1;
      
      if (startIdx !== -1 && endIdx !== -1) {
        const relevantMonths = monthOrder.filter((_, idx) => idx >= startIdx && idx <= endIdx);
        shootsToAnalyze = shootsToAnalyze.filter(invoice => {
          const { month, year } = getMonthYear(invoice);
          const monthKey = `${year}-${String(month).padStart(2, '0')}`;
          return relevantMonths.includes(monthKey);
        });
      }
    }
    
    // Calculate category totals based on the shoot's approved amount, distributed by equipment
    shootsToAnalyze.forEach(invoice => {
      const shootTotal = parseAmount(invoice); // This is what the chart uses
      
      if (invoice.equipment && Array.isArray(invoice.equipment) && invoice.equipment.length > 0) {
        // Calculate raw equipment total to get proportions
        let equipmentRawTotal = 0;
        const equipmentItems: { category: string; rawCost: number; qty: number }[] = [];
        
        invoice.equipment.forEach((eq: any) => {
          const category = inferCategory(eq.name || eq.itemName || '', eq.category);
          const qty = eq.quantity || eq.qty || 1;
          const rate = eq.vendorRate || eq.dailyRate || eq.rate || eq.price || eq.rentalCost || eq.cost || 0;
          const days = eq.days || eq.rentalDays || 1;
          const rawCost = eq.total || eq.totalCost || (Number(qty) * Number(rate) * Number(days));
          
          equipmentRawTotal += Number(rawCost);
          equipmentItems.push({ category, rawCost: Number(rawCost), qty: Number(qty) });
        });
        
        // Distribute the approved amount proportionally across categories
        if (equipmentRawTotal > 0) {
          equipmentItems.forEach(item => {
            const proportion = item.rawCost / equipmentRawTotal;
            const allocatedAmount = shootTotal * proportion;
            
            if (!categoryTotals[item.category]) {
              categoryTotals[item.category] = { value: 0, count: 0 };
            }
            categoryTotals[item.category].value += allocatedAmount;
            categoryTotals[item.category].count += item.qty;
          });
        }
      } else {
        // No equipment breakdown - put in "Other"
        if (!categoryTotals['Other']) {
          categoryTotals['Other'] = { value: 0, count: 0 };
        }
        categoryTotals['Other'].value += shootTotal;
        categoryTotals['Other'].count += 1;
      }
    });
    
    // Convert to array and sort by value
    const data = Object.entries(categoryTotals)
      .map(([name, { value, count }]) => ({ name, value: Math.round(Number(value)), count }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
    
    // Calculate total for percentages
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return data.map(item => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0
    }));
  }, [invoiceData, monthOrder, selectedMonthStart, selectedMonthEnd, chartView, selectedStartDate, selectedEndDate]);

  // Detailed category items for drill-down view
  const categoryDetailedItems = useMemo(() => {
    const categoryItems: { [key: string]: { name: string; shootName: string; qty: number; rate: number; days: number; total: number }[] } = {};
    
    // Use the same filtering logic as categorySpendingData
    let shootsToAnalyze = [...invoiceData];
    
    if (chartView === 'daily' && selectedStartDate && selectedEndDate) {
      const startDate = new Date(selectedStartDate);
      const endDate = new Date(selectedEndDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      shootsToAnalyze = shootsToAnalyze.filter(invoice => {
        const shootDate = getShootDateObj(invoice);
        return shootDate && shootDate >= startDate && shootDate <= endDate;
      });
    }
    
    if (chartView === 'monthly' && (selectedMonthStart || selectedMonthEnd)) {
      const startIdx = selectedMonthStart ? monthOrder.indexOf(selectedMonthStart) : 0;
      const endIdx = selectedMonthEnd ? monthOrder.indexOf(selectedMonthEnd) : monthOrder.length - 1;
      
      if (startIdx !== -1 && endIdx !== -1) {
        const relevantMonths = monthOrder.filter((_, idx) => idx >= startIdx && idx <= endIdx);
        shootsToAnalyze = shootsToAnalyze.filter(invoice => {
          const { month, year } = getMonthYear(invoice);
          const monthKey = `${year}-${String(month).padStart(2, '0')}`;
          return relevantMonths.includes(monthKey);
        });
      }
    }
    
    shootsToAnalyze.forEach(invoice => {
      const shootName = invoice.name || invoice.title || 'Unknown Shoot';
      const shootTotal = parseAmount(invoice);
      
      if (invoice.equipment && Array.isArray(invoice.equipment) && invoice.equipment.length > 0) {
        invoice.equipment.forEach((eq: any) => {
          const category = inferCategory(eq.name || eq.itemName || '', eq.category);
          const itemName = eq.name || eq.itemName || 'Unknown Item';
          const qty = eq.quantity || eq.qty || 1;
          const rate = eq.vendorRate || eq.dailyRate || eq.rate || eq.price || eq.rentalCost || eq.cost || 0;
          const days = eq.days || eq.rentalDays || 1;
          const total = eq.total || eq.totalCost || (Number(qty) * Number(rate) * Number(days));
          
          if (!categoryItems[category]) {
            categoryItems[category] = [];
          }
          categoryItems[category].push({
            name: itemName,
            shootName,
            qty: Number(qty),
            rate: Number(rate),
            days: Number(days),
            total: Number(total)
          });
        });
      } else if (shootTotal > 0) {
        // Shoots without equipment breakdown go to "Other" (matching categorySpendingData logic)
        if (!categoryItems['Other']) {
          categoryItems['Other'] = [];
        }
        categoryItems['Other'].push({
          name: 'Shoot Total (No Equipment Breakdown)',
          shootName,
          qty: 1,
          rate: shootTotal,
          days: 1,
          total: shootTotal
        });
      }
    });
    
    return categoryItems;
  }, [invoiceData, monthOrder, selectedMonthStart, selectedMonthEnd, chartView, selectedStartDate, selectedEndDate]);

  // Colors for pie chart
  const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const shootNames: string[] = data.shootNames || [];
      const amount = Number(payload[0].value) || 0;
      
      return (
        <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-200" style={{ minWidth: '200px', maxWidth: '300px' }}>
          <p className="font-bold text-gray-900 text-base mb-1">{data.fullName}</p>
          <p className="text-xl font-bold mb-2" style={{ color: '#FF6B6B' }}>₹{amount.toLocaleString()}</p>
          
          {shootNames.length > 0 ? (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">
                {shootNames.length} Shoot{shootNames.length > 1 ? 's' : ''}:
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {shootNames.map((name: string, idx: number) => (
                  <p key={idx} className="text-sm text-gray-700 flex items-start gap-1">
                    <span className="text-gray-400">•</span>
                    <span className="truncate">{name}</span>
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 pt-2 border-t border-gray-200">No shoots</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#F5F7FA' }}>
      {/* Left Sidebar */}
      <div className="w-64 flex flex-col" style={{ backgroundColor: '#1F2937' }}>
        <div className="px-6 py-6 border-b" style={{ borderColor: '#374151' }}>
          <h2 className="text-white text-xl">ShootFlow</h2>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <button onClick={onBack} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-gray-700" style={{ color: '#9CA3AF' }}>
            <LayoutDashboard className="w-5 h-5" />
            <span>Active Shoots</span>
          </button>
          <button onClick={onOpenApprovals} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors relative hover:bg-gray-700" style={{ color: '#9CA3AF' }}>
            <CheckCircle className="w-5 h-5" />
            <span>Approvals</span>
            {approvalsPending > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: '#F2994A', color: 'white' }}>{approvalsPending}</span>
            )}
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors" style={{ backgroundColor: '#2D60FF', color: 'white' }}>
            <DollarSign className="w-5 h-5" />
            <span>Finance & Invoices</span>
          </button>
          <button onClick={onOpenCatalog} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-gray-700" style={{ color: '#9CA3AF' }}>
            <Package className="w-5 h-5" />
            <span>Catalog</span>
          </button>
          <button onClick={onOpenArchive} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors hover:bg-gray-700" style={{ color: '#9CA3AF' }}>
            <Archive className="w-5 h-5" />
            <span>Archive</span>
          </button>
        </nav>

        <div className="px-4 py-6 border-t" style={{ borderColor: '#374151' }}>
          <div className="flex items-center gap-3 px-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: '#2D60FF' }}>{isAdmin ? 'A' : 'PT'}</div>
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
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Finance & Invoices</h1>
              <p className="text-gray-400 text-sm">Track payments and spending trends</p>
            </div>
            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('list')}
                className="flex items-center gap-2 rounded-full font-medium transition-all whitespace-nowrap"
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  lineHeight: '1',
                  backgroundColor: viewMode === 'list' ? '#2563EB' : '#F3F4F6',
                  color: viewMode === 'list' ? '#FFFFFF' : '#4B5563',
                  boxShadow: viewMode === 'list' ? '0 2px 8px rgba(37, 99, 235, 0.4)' : 'none'
                }}
              >
                <List className="w-4 h-4" />
                List
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className="flex items-center gap-2 rounded-full font-medium transition-all whitespace-nowrap"
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  lineHeight: '1',
                  backgroundColor: viewMode === 'chart' ? '#2563EB' : '#F3F4F6',
                  color: viewMode === 'chart' ? '#FFFFFF' : '#4B5563',
                  boxShadow: viewMode === 'chart' ? '0 2px 8px rgba(37, 99, 235, 0.4)' : 'none'
                }}
              >
                <BarChart3 className="w-4 h-4" />
                Chart
              </button>
            </div>
          </div>
        </div>

        {/* Tabs + Stats Row */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Tabs */}
            <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterTab('all')}
                className="rounded-full font-medium transition-all whitespace-nowrap"
              style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  lineHeight: '1',
                  backgroundColor: filterTab === 'all' ? '#2D60FF' : '#F3F4F6',
                  color: filterTab === 'all' ? '#FFFFFF' : '#4B5563',
                  boxShadow: filterTab === 'all' ? '0 2px 8px rgba(45, 96, 255, 0.4)' : 'none'
                }}
              >
                All ({invoiceData.length})
            </button>
            <button
              onClick={() => setFilterTab('paid')}
                className="rounded-full font-medium transition-all whitespace-nowrap"
              style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  lineHeight: '1',
                  backgroundColor: filterTab === 'paid' ? '#2D60FF' : '#F3F4F6',
                  color: filterTab === 'paid' ? '#FFFFFF' : '#4B5563',
                  boxShadow: filterTab === 'paid' ? '0 2px 8px rgba(45, 96, 255, 0.4)' : 'none'
                }}
              >
                Paid ({shoots.filter(s => s.paid).length})
            </button>
            <button
              onClick={() => setFilterTab('pending')}
                className="rounded-full font-medium transition-all whitespace-nowrap"
              style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  lineHeight: '1',
                  backgroundColor: filterTab === 'pending' ? '#2D60FF' : '#F3F4F6',
                  color: filterTab === 'pending' ? '#FFFFFF' : '#4B5563',
                  boxShadow: filterTab === 'pending' ? '0 2px 8px rgba(45, 96, 255, 0.4)' : 'none'
                }}
              >
                Pending ({shoots.filter(s => !s.paid && (s.status === 'pending_invoice' || s.status === 'completed')).length})
              </button>
            </div>

            {/* Right: Stats + Filter */}
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-gray-400">Total Paid</div>
                <div className="text-lg font-bold text-gray-900">₹{totalPaid.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Pending</div>
                <div className="text-lg font-bold text-gray-900">₹{totalPending.toLocaleString()}</div>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
                    filterStartDate && filterEndDate 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  {filterStartDate && filterEndDate 
                    ? `${new Date(filterStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(filterEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                    : 'Filter by Date'}
                </button>
                
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-gray-200 shadow-xl p-4 z-50 min-w-[320px]">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Filter by Date</h4>
                      <button 
                        onClick={() => setShowFilterDropdown(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">From</label>
                        <input
                          type="date"
                          value={filterStartDate}
                          onChange={(e) => setFilterStartDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">To</label>
                        <input
                          type="date"
                          value={filterEndDate}
                          onChange={(e) => setFilterEndDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => {
                          setFilterStartDate('');
                          setFilterEndDate('');
                        }}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setShowFilterDropdown(false)}
                        className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                      >
                        Apply
            </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 py-4">
          {viewMode === 'chart' ? (
            /* Chart View */
            <div className="space-y-6">
              {/* Time Period Selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-500">View:</span>
                <button
                  onClick={() => setChartView('monthly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    chartView === 'monthly' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => {
                    setChartView('daily');
                    // Set default date range to last 7 days if not set
                    if (!selectedStartDate || !selectedEndDate) {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(start.getDate() - 7);
                      setSelectedStartDate(start.toISOString().split('T')[0]);
                      setSelectedEndDate(end.toISOString().split('T')[0]);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    chartView === 'daily' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Weekly
                </button>
                
                {/* Month Selector for Monthly view */}
                {chartView === 'monthly' && (
                  <div className="flex items-center gap-2 ml-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-500">From:</label>
                      <select
                        value={selectedMonthStart}
                        onChange={(e) => setSelectedMonthStart(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All</option>
                        {monthOrder.map(m => (
                          <option key={m} value={m}>{formatMonthKey(m)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-500">To:</label>
                      <select
                        value={selectedMonthEnd}
                        onChange={(e) => setSelectedMonthEnd(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">All</option>
                        {monthOrder.map(m => (
                          <option key={m} value={m}>{formatMonthKey(m)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                
                {/* Date Selector for Weekly view */}
                {chartView === 'daily' && (
                  <div className="flex items-center gap-2 ml-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-500">From:</label>
                      <input
                        type="date"
                        value={selectedStartDate}
                        onChange={(e) => setSelectedStartDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-500">To:</label>
                      <input
                        type="date"
                        value={selectedEndDate}
                        onChange={(e) => setSelectedEndDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Main Chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {chartView === 'monthly' ? 'Monthly Spending' : 'Weekly Spending'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {chartView === 'monthly' 
                        ? 'Track your spending month over month' 
                        : selectedStartDate && selectedEndDate 
                          ? `${new Date(selectedStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(selectedEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : 'Select a date range'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Total</div>
                    <div className="text-2xl font-bold" style={{ color: '#FF6B6B' }}>
                      ₹{chartData.reduce((sum, d) => Number(sum) + Number(d.amount), 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {chartData.length > 0 ? (
                  <div key={`chart-${chartView}`} style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="#FF6B6B" 
                          strokeWidth={3}
                          dot={{ r: 6, fill: '#FF6B6B', stroke: '#fff', strokeWidth: 2 }}
                          activeDot={{ r: 8, fill: '#FF6B6B', stroke: '#fff', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-gray-400">
                    No data available for chart
                  </div>
                )}
              </div>

              {/* Category Spending Pie Chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Spending by Category</h3>
                    <p className="text-sm text-gray-500">
                      Equipment breakdown • {chartView === 'daily' && selectedStartDate && selectedEndDate 
                        ? `${new Date(selectedStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(selectedEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : selectedMonthStart || selectedMonthEnd
                          ? `${selectedMonthStart ? formatMonthKey(selectedMonthStart) : 'Start'} - ${selectedMonthEnd ? formatMonthKey(selectedMonthEnd) : 'End'}`
                          : `All ${invoiceData.length} shoots`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Total</div>
                    <div className="text-lg font-bold" style={{ color: '#27AE60' }}>
                      ₹{categorySpendingData.reduce((sum, d) => sum + d.value, 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {categorySpendingData.length > 0 ? (
                  <div className="flex items-start gap-10">
                    {/* Pie Chart - Bigger */}
                    <div style={{ width: 450, height: 450, flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categorySpendingData}
                            cx="50%"
                            cy="50%"
                            innerRadius={100}
                            outerRadius={170}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ percentage }) => `${percentage}%`}
                            labelLine={false}
                          >
                            {categorySpendingData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Legend with Count - Clickable */}
                    <div className="flex-1 grid grid-cols-2 gap-3 pt-4">
                      {categorySpendingData.map((item, index) => (
                        <div 
                          key={item.name} 
                          className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer hover:shadow-md"
                          onClick={() => setSelectedCategory(item.name)}
                        >
                          <div 
                            className="w-5 h-5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900 truncate">{item.name}</span>
                              <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                                {item.count} {item.count === 1 ? 'item' : 'items'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-lg font-bold" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }}>
                                {item.percentage}%
                              </span>
                              <span className="text-sm text-gray-500">
                                ₹{item.value.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs text-blue-500 mt-1">Click to view items →</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center text-gray-400">
                    No category data available. Equipment items need categories assigned.
                  </div>
                )}
              </div>

              {/* Monthly Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                {monthOrder.slice(-6).map(monthKey => {
                  const monthShoots = groupedInvoices[monthKey] || [];
                  const total = getMonthTotal(monthShoots);
                  const [year, month] = monthKey.split('-').map(Number);
                  const isSelected = selectedMonthStart === monthKey || selectedMonthEnd === monthKey || 
                    (selectedMonthStart === monthKey && selectedMonthEnd === monthKey);
                  
                  return (
                    <div
                      key={monthKey}
                      className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer ${
                        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                      }`}
                      onClick={() => {
                        // Set both monthly filter to this month and switch to daily view with date range
                        setSelectedMonthStart(monthKey);
                        setSelectedMonthEnd(monthKey);
                        
                        // Also set daily view with full month date range
                        // month from monthKey is 0-based (04 = May), so use directly
                        const startDate = new Date(year, month, 1);
                        const endDate = new Date(year, month + 1, 0); // Last day of month
                        setSelectedStartDate(`${year}-${String(month + 1).padStart(2, '0')}-01`);
                        setSelectedEndDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`);
                        setChartView('daily');
                      }}
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                    >
                      <div className="text-sm text-gray-500">{formatMonthKey(monthKey)}</div>
                      <div className="text-xl font-bold mt-1" style={{ color: '#27AE60' }}>₹{total.toLocaleString()}</div>
                      <div className="text-xs text-gray-400 mt-1">{monthShoots.length} shoots</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* List View */
            <div className="space-y-6">
              {monthOrder.slice().reverse().map(monthKey => {
                const monthInvoices = groupedInvoices[monthKey];
              if (!monthInvoices || monthInvoices.length === 0) return null;
                
                const isExpanded = expandedMonths.has(monthKey);
                const monthTotal = getMonthTotal(monthInvoices);
                const paidCount = getMonthPaidCount(monthInvoices);
              
              return (
                  <div key={monthKey} className="bg-white rounded-xl border border-gray-200 mb-2" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
                    <button onClick={() => toggleMonth(monthKey)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">{formatMonthKey(monthKey)}</div>
                          <div className="text-sm text-gray-500">{monthInvoices.length} shoots • {paidCount} paid</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold" style={{ color: '#27AE60' }}>₹{monthTotal.toLocaleString()}</div>
                  </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        <div className="divide-y divide-gray-100">
                          {monthInvoices.map((invoice) => {
                            const isInvoiceExpanded = expandedInvoices.has(invoice.id);
                            // Check if has equipment with any data (rate, price, total, or just items)
                            const hasEquipment = invoice.equipment && invoice.equipment.length > 0 && 
                              invoice.equipment.some((e: any) => 
                                (e.rate || e.price || e.dailyRate || e.vendorRate || e.rentalCost || e.cost || e.total || e.totalCost || e.name || e.itemName) 
                              );
                            // Always make clickable if has equipment OR has invoice file
                            const isClickable = hasEquipment || invoice.invoiceFile?.data;
                            
                            return (
                              <div key={invoice.id}>
                                <div 
                                  className={`px-5 py-3 flex items-center justify-between transition-colors ${isClickable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                  onClick={() => isClickable && toggleInvoice(invoice.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${invoice.paid ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                      {isClickable ? (
                                        isInvoiceExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                      ) : (
                                        <FileText className="w-4 h-4" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900 text-sm">{invoice.name}</div>
                                      <div className="text-xs text-gray-500">{invoice.date}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="font-semibold text-sm" style={{ color: '#27AE60' }}>₹{invoice.amount.toLocaleString()}</div>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${invoice.paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {invoice.paid ? 'Paid' : 'Pending'}
                                  </span>
                                    </div>
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      {invoice.invoiceFile && (
                                        <button onClick={() => openPdfViewer(invoice)} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50" title="View">
                                    <FileText className="w-4 h-4" />
                                  </button>
                                )}
                                      <button onClick={() => onUploadInvoice(invoice.id)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100" title={invoice.invoiceFile ? 'Replace PDF' : 'Upload PDF'}>
                                        <Upload className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Expanded Details */}
                                {isInvoiceExpanded && isClickable && (
                                  <div className="bg-gray-50 px-5 py-4 ml-11 mr-5 mb-3 rounded-lg">
                                    {/* Invoice PDF Preview */}
                                    {invoice.invoiceFile?.data && (
                                      <div className="mb-4">
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                          Invoice Document
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); openPdfViewer(invoice); }}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                          >
                                            <FileText className="w-4 h-4" />
                                            View Invoice PDF
                                          </button>
                                          <span className="text-sm text-gray-500">{invoice.invoiceFile.name}</span>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Equipment Details */}
                                    {hasEquipment && (
                                      <>
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                          Equipment Details ({invoice.equipment.length} items)
                                        </div>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-sm border-collapse min-w-full">
                                            <thead>
                                              <tr className="text-left text-gray-500 text-xs bg-gray-100">
                                                <th className="py-2 px-3 font-medium border-b border-gray-200">Item</th>
                                                <th className="py-2 px-3 font-medium text-center border-b border-gray-200">Qty</th>
                                                <th className="py-2 px-3 font-medium text-right border-b border-gray-200">Rate</th>
                                                <th className="py-2 px-3 font-medium text-center border-b border-gray-200">Days</th>
                                                <th className="py-2 px-3 font-medium text-right border-b border-gray-200">Total</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {invoice.equipment.map((item: any, idx: number) => {
                                                const qty = item.quantity || item.qty || 1;
                                                const rate = item.dailyRate || item.vendorRate || item.rate || item.price || item.rentalCost || item.cost || 0;
                                                const days = item.days || item.rentalDays || 1;
                                                const total = item.total || item.totalCost || (qty * rate * days);
                                                return (
                                                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-100">
                                                    <td className="py-2 px-3 text-gray-900">{item.name || item.itemName || '-'}</td>
                                                    <td className="py-2 px-3 text-center text-gray-600">{qty}</td>
                                                    <td className="py-2 px-3 text-right text-gray-600">₹{Number(rate).toLocaleString()}</td>
                                                    <td className="py-2 px-3 text-center text-gray-600">{days}</td>
                                                    <td className="py-2 px-3 text-right font-medium text-gray-900">₹{Number(total).toLocaleString()}</td>
                            </tr>
                                                );
                                              })}
                        </tbody>
                                            <tfoot>
                                              <tr className="border-t-2 border-gray-400 bg-gray-200">
                                                <td colSpan={4} className="py-2 px-3 font-semibold text-gray-900">Total</td>
                                                <td className="py-2 px-3 text-right font-bold" style={{ color: '#27AE60' }}>₹{invoice.amount.toLocaleString()}</td>
                                              </tr>
                                            </tfoot>
                      </table>
                                        </div>
                                      </>
                                    )}
                                    
                                    {/* If no equipment but has PDF */}
                                    {!hasEquipment && invoice.invoiceFile?.data && (
                                      <div className="text-sm text-gray-500 mt-2">
                                        Click "View Invoice PDF" above to see the full invoice details.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                    </div>
                    )}
                </div>
              );
            })}

            {invoiceData.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No invoices found for the selected filter.</p>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showPdfModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-h-[90vh] overflow-hidden flex flex-col" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)', width: '500px' }}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Invoice Details</h2>
                <p className="text-sm text-gray-500">{selectedInvoice.name}</p>
              </div>
              <button onClick={() => { setShowPdfModal(false); setSelectedInvoice(null); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0FDF4' }}>
                  <div className="text-sm mb-1" style={{ color: '#27AE60' }}>Amount Paid</div>
                  <div className="text-2xl font-bold" style={{ color: '#27AE60' }}>₹{parseAmount(selectedInvoice).toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <div className="text-sm text-gray-500 mb-1">Date</div>
                  <div className="text-lg font-semibold text-gray-900">{selectedInvoice.date}</div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-sm font-medium text-gray-700 mb-3">Invoice Document</div>
                <div className="border-2 rounded-xl p-4" style={{ borderColor: '#27AE60', backgroundColor: '#F0FDF4' }}>
                    <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#27AE60' }}>
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                      <div className="font-medium text-gray-900">{selectedInvoice.invoiceFile?.name || 'invoice.pdf'}</div>
                      <div className="text-sm" style={{ color: '#27AE60' }}>PDF Document</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-3">Details</div>
                      <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-500">Vendor</span>
                    <span className="text-gray-900">Gopala Digital World</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Location</span>
                    <span className="text-gray-900">{selectedInvoice.location}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">Duration</span>
                    <span className="text-gray-900">{selectedInvoice.duration}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100">
              <div className="flex gap-3">
                {selectedInvoice.invoiceFile?.data ? (
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                      link.href = selectedInvoice.invoiceFile!.data!;
                      link.download = selectedInvoice.invoiceFile!.name || 'invoice.pdf';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex-1 py-3 rounded-lg text-white transition-colors font-medium flex items-center justify-center gap-2 hover:opacity-90"
                    style={{ backgroundColor: '#27AE60' }}
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                ) : (
                  <button
                    onClick={() => onUploadInvoice(selectedInvoice.id)}
                    className="flex-1 py-3 rounded-lg border-2 transition-colors font-medium flex items-center justify-center gap-2 hover:bg-orange-50"
                    style={{ borderColor: '#F2994A', color: '#F2994A' }}
                  >
                    <Upload className="w-4 h-4" />
                    Upload PDF
                  </button>
                )}
                <button
                  onClick={() => { setShowPdfModal(false); setSelectedInvoice(null); }}
                  className="px-6 py-3 rounded-lg border border-gray-300 text-gray-600 transition-colors font-medium hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Details Modal */}
      {selectedCategory && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedCategory(null)}
        >
          <div 
            className="bg-white rounded-2xl flex flex-col" 
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)', width: '800px', maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div 
                  className="w-5 h-5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[categorySpendingData.findIndex(c => c.name === selectedCategory) % PIE_COLORS.length] }}
                />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedCategory}</h2>
                  <p className="text-sm text-gray-500">
                    {categoryDetailedItems[selectedCategory]?.length || 0} equipment items
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCategory(null)} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6" style={{ minHeight: 0 }}>
              {categoryDetailedItems[selectedCategory] && categoryDetailedItems[selectedCategory].length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-gray-500 text-xs bg-gray-50">
                      <th className="py-3 px-4 font-medium rounded-tl-lg">Equipment Name</th>
                      <th className="py-3 px-4 font-medium">Shoot</th>
                      <th className="py-3 px-4 font-medium text-center">Qty</th>
                      <th className="py-3 px-4 font-medium text-right">Rate</th>
                      <th className="py-3 px-4 font-medium text-center">Days</th>
                      <th className="py-3 px-4 font-medium text-right rounded-tr-lg">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryDetailedItems[selectedCategory].map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                        <td className="py-3 px-4 text-gray-600 max-w-[150px] truncate" title={item.shootName}>{item.shootName}</td>
                        <td className="py-3 px-4 text-center text-gray-600">{item.qty}</td>
                        <td className="py-3 px-4 text-right text-gray-600">₹{item.rate.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center text-gray-600">{item.days}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">₹{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No items found in this category</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50 rounded-b-2xl">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Total ({categoryDetailedItems[selectedCategory]?.length || 0} items)
                </div>
                <div className="text-xl font-bold" style={{ color: '#27AE60' }}>
                  ₹{(categoryDetailedItems[selectedCategory]?.reduce((sum, item) => sum + item.total, 0) || 0).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="w-full py-3 mt-3 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
