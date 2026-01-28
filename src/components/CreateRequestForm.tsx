import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ChevronDown, Calendar, Search, Plus, Camera, Trash2, Check, Aperture, Sun, Mic, Video, Clapperboard, Package, Truck, Users, Lightbulb, Monitor, HardDrive, Headphones, Radio, Zap, CheckCircle, AlertTriangle, AlertOctagon, Copy, Lock } from 'lucide-react';
import type { CatalogItem } from './EquipmentCatalogManager';

interface CartItem extends CatalogItem {
  quantity: number;
}

interface ShootData {
  id: string;
  shootName: string;
  location: string;
  selectedStartDate: { day: number; month: number; year: number } | null;
  selectedEndDate: { day: number; month: number; year: number } | null;
  cart: CartItem[];
}

interface CreateRequestFormProps {
  onClose: () => void;
  onSubmit: (requestData: any) => void | Promise<void>;
  catalogItems: CatalogItem[];
  onAddCatalogItem?: (item: CatalogItem) => void;
}

export function CreateRequestForm({ onClose, onSubmit, catalogItems, onAddCatalogItem }: CreateRequestFormProps) {
  // Get current date in India timezone (IST)
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Shared fields
  const [requestorName, setRequestorName] = useState('');
  const [approvalEmail, setApprovalEmail] = useState('');
  
  // Add New Equipment Modal state
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    category: 'Camera',
    dailyRate: 0,
    customCategory: ''
  });
  const equipmentCategories = ['Camera', 'Lens', 'Light', 'Tripod', 'Audio', 'Small Equipments', 'Extra', 'Assistant', 'Gaffer', 'Transport', 'Other'];
  
  // Multi-shoot support
  const [shoots, setShoots] = useState<ShootData[]>([
    {
      id: '1',
      shootName: '',
      location: '',
      selectedStartDate: null,
      selectedEndDate: null,
      cart: []
    }
  ]);
  const [activeShootIndex, setActiveShootIndex] = useState(0);
  
  // Calendar states (per active shoot)
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [startCalendarMonth, setStartCalendarMonth] = useState({ month: currentMonth, year: currentYear });
  const [endCalendarMonth, setEndCalendarMonth] = useState({ month: currentMonth, year: currentYear });
  
  // Search and category states
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Prevent double submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs for click-outside detection
  const startCalendarRef = useRef<HTMLDivElement>(null);
  const endCalendarRef = useRef<HTMLDivElement>(null);
  
  // Click outside to close calendars
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startCalendarRef.current && !startCalendarRef.current.contains(event.target as Node)) {
        setShowStartCalendar(false);
      }
      if (endCalendarRef.current && !endCalendarRef.current.contains(event.target as Node)) {
        setShowEndCalendar(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get current active shoot
  const activeShoot = shoots[activeShootIndex];

  // Get unique categories from catalog
  const categories = Array.from(new Set(catalogItems.map(item => item.category))).sort();

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Auto-expand categories that have matching items when searching
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const matchingCategories = new Set<string>();
      catalogItems.forEach(item => {
        if (
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          matchingCategories.add(item.category);
        }
      });
      setExpandedCategories(matchingCategories);
    } else if (searchQuery.trim().length === 0) {
      setExpandedCategories(new Set());
    }
  }, [searchQuery, catalogItems]);

  // Update active shoot data
  const updateActiveShoot = (field: keyof ShootData, value: any) => {
    setShoots(prev => prev.map((shoot, idx) => 
      idx === activeShootIndex ? { ...shoot, [field]: value } : shoot
    ));
  };

  // Add new shoot - copies dates from first shoot (same day shoots)
  const addShoot = () => {
    const firstShoot = shoots[0];
    const newShoot: ShootData = {
      id: Date.now().toString(),
      shootName: '',
      location: '',
      // Copy dates from first shoot - multi-shoots are for same day
      selectedStartDate: firstShoot.selectedStartDate ? { ...firstShoot.selectedStartDate } : null,
      selectedEndDate: firstShoot.selectedEndDate ? { ...firstShoot.selectedEndDate } : null,
      cart: []
    };
    setShoots([...shoots, newShoot]);
    setActiveShootIndex(shoots.length);
  };

  // Check if dates should be locked (for shoots other than the first one)
  const areDatesLocked = activeShootIndex > 0 && shoots.length > 1;

  // Sync dates from first shoot to all other shoots when first shoot's dates change
  useEffect(() => {
    if (shoots.length > 1) {
      const firstShoot = shoots[0];
      const needsUpdate = shoots.some((shoot, index) => {
        if (index === 0) return false;
        const startDiff = JSON.stringify(shoot.selectedStartDate) !== JSON.stringify(firstShoot.selectedStartDate);
        const endDiff = JSON.stringify(shoot.selectedEndDate) !== JSON.stringify(firstShoot.selectedEndDate);
        return startDiff || endDiff;
      });

      if (needsUpdate) {
        setShoots(prev => prev.map((shoot, index) => {
          if (index === 0) return shoot;
          return {
            ...shoot,
            selectedStartDate: firstShoot.selectedStartDate ? { ...firstShoot.selectedStartDate } : null,
            selectedEndDate: firstShoot.selectedEndDate ? { ...firstShoot.selectedEndDate } : null,
          };
        }));
      }
    }
  }, [shoots[0]?.selectedStartDate, shoots[0]?.selectedEndDate, shoots.length]);

  // Remove shoot
  const removeShoot = (index: number) => {
    if (shoots.length <= 1) return;
    const newShoots = shoots.filter((_, idx) => idx !== index);
    setShoots(newShoots);
    if (activeShootIndex >= newShoots.length) {
      setActiveShootIndex(newShoots.length - 1);
    } else if (activeShootIndex > index) {
      setActiveShootIndex(activeShootIndex - 1);
    }
  };

  // Copy equipment from another shoot
  const copyEquipmentFrom = (fromIndex: number) => {
    const sourceCart = shoots[fromIndex].cart;
    updateActiveShoot('cart', [...sourceCart]);
  };

  // Cart operations for active shoot
  const addToCart = (item: CatalogItem) => {
    const currentCart = activeShoot.cart;
    const existing = currentCart.find(c => c.id === item.id);
    if (existing) {
      updateActiveShoot('cart', currentCart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      updateActiveShoot('cart', [...currentCart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    updateActiveShoot('cart', activeShoot.cart.filter(c => c.id !== itemId));
  };

  const decreaseQuantity = (itemId: string) => {
    const item = activeShoot.cart.find(c => c.id === itemId);
    if (item && item.quantity > 1) {
      updateActiveShoot('cart', activeShoot.cart.map(c => c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c));
    } else {
      removeFromCart(itemId);
    }
  };

  const getCartQuantity = (itemId: string) => {
    const item = activeShoot.cart.find(c => c.id === itemId);
    return item ? item.quantity : 0;
  };
  
  // Handle adding new equipment to catalog and cart
  const handleAddNewEquipment = () => {
    if (!newEquipment.name.trim() || newEquipment.dailyRate <= 0) {
      return;
    }
    
    const finalCategory = newEquipment.category === 'Other' && newEquipment.customCategory.trim() 
      ? newEquipment.customCategory.trim() 
      : newEquipment.category;
    
    const newItem: CatalogItem = {
      id: `new-${Date.now()}`,
      name: newEquipment.name.trim(),
      category: finalCategory,
      dailyRate: newEquipment.dailyRate,
      available: true
    };
    
    // Add to catalog via callback
    if (onAddCatalogItem) {
      onAddCatalogItem(newItem);
    }
    
    // Add to current shoot's cart
    updateActiveShoot('cart', [...activeShoot.cart, { ...newItem, quantity: 1 }]);
    
    // Reset form and close modal
    setNewEquipment({ name: '', category: 'Camera', dailyRate: 0, customCategory: '' });
    setShowAddEquipmentModal(false);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const dateToTimestamp = (date: { day: number; month: number; year: number }) => {
    return new Date(date.year, date.month, date.day).getTime();
  };

  const calculateDays = (shoot: ShootData) => {
    if (shoot.selectedStartDate && shoot.selectedEndDate) {
      const start = new Date(shoot.selectedStartDate.year, shoot.selectedStartDate.month, shoot.selectedStartDate.day);
      const end = new Date(shoot.selectedEndDate.year, shoot.selectedEndDate.month, shoot.selectedEndDate.day);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, diffDays);
    }
    return 1;
  };

  const calculateShootTotal = (shoot: ShootData) => {
    const days = calculateDays(shoot);
    return shoot.cart.reduce((sum, item) => sum + (item.dailyRate * item.quantity * days), 0);
  };

  const calculateGrandTotal = () => {
    return shoots.reduce((sum, shoot) => sum + calculateShootTotal(shoot), 0);
  };

  // Get budget status based on total amount
  const getBudgetStatus = (total: number) => {
    if (total <= 30000) {
      return {
        color: '#27AE60',
        bgColor: '#E8F5E9',
        label: 'In Budget',
        Icon: CheckCircle
      };
    } else if (total <= 60000) {
      return {
        color: '#F5A623',
        bgColor: '#FFF8E1',
        label: 'Slightly Over Budget',
        Icon: AlertTriangle
      };
    } else {
      return {
        color: '#E74C3C',
        bgColor: '#FFEBEE',
        label: 'Over Budget',
        Icon: AlertOctagon
      };
    }
  };

  const formatDate = (date: { day: number; month: number; year: number } | null) => {
    if (!date) return '';
    return `${monthNamesShort[date.month]} ${date.day}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      console.log('Already submitting, ignoring click');
      return;
    }
    
    console.log('Starting submission...');
    setIsSubmitting(true);
    
    try {
      // Generate a unique request group ID for multi-shoot requests
      const requestGroupId = shoots.length > 1 ? `group-${Date.now()}` : undefined;
      
      // Submit all shoots as part of one request
      const shootsData = shoots.map(shoot => {
        const days = calculateDays(shoot);
        return {
          shootName: shoot.shootName,
          location: shoot.location,
          startDate: shoot.selectedStartDate ? `${shoot.selectedStartDate.year}-${String(shoot.selectedStartDate.month + 1).padStart(2, '0')}-${String(shoot.selectedStartDate.day).padStart(2, '0')}` : '',
          endDate: shoot.selectedEndDate ? `${shoot.selectedEndDate.year}-${String(shoot.selectedEndDate.month + 1).padStart(2, '0')}-${String(shoot.selectedEndDate.day).padStart(2, '0')}` : '',
          equipment: shoot.cart.map(item => ({ ...item, days, expectedRate: item.dailyRate })),
          totalBudget: calculateShootTotal(shoot),
        };
      });

      // Submit all shoots together
      const allShootsData = shootsData.map((shootData, index) => ({
        requestorName,
        ...shootData,
        shootName: shootData.shootName || `Shoot ${index + 1}`,
        approvalEmail,
        isMultiShoot: shoots.length > 1,
        multiShootIndex: index,
        totalShootsInRequest: shoots.length,
        requestGroupId,
      }));

      console.log('Submitting data:', shoots.length === 1 ? 'single shoot' : `${shoots.length} shoots`);

      // Pass all shoots as an array if multiple, or single object if one
      if (shoots.length === 1) {
        await onSubmit(allShootsData[0]);
      } else {
        // Submit as array for batch processing
        await onSubmit({ 
          isMultiShootBatch: true, 
          shoots: allShootsData,
          requestGroupId 
        });
      }
      
      console.log('Submission completed successfully');
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Error submitting request. Please try again.');
      // Reset submitting state on error so user can retry
      setIsSubmitting(false);
    }
  };

  // Calendar generation for any month/year
  const generateCalendar = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const isDateDisabled = (day: number, month: number, year: number, isEndDate: boolean = false) => {
    const dateTimestamp = new Date(year, month, day).getTime();
    const todayTimestamp = new Date(currentYear, currentMonth, currentDay).setHours(0, 0, 0, 0);
    
    if (dateTimestamp < todayTimestamp) {
      return true;
    }
    
    if (isEndDate && activeShoot.selectedStartDate) {
      const startTimestamp = dateToTimestamp(activeShoot.selectedStartDate);
      if (dateTimestamp < startTimestamp) {
        return true;
      }
    }
    
    return false;
  };

  const canNavigatePrev = (calendarMonth: { month: number; year: number }) => {
    if (calendarMonth.year > currentYear) return true;
    if (calendarMonth.year === currentYear && calendarMonth.month > currentMonth) return true;
    return false;
  };

  // Filter equipment based on search
  const filteredEquipment = catalogItems.filter(item =>
    searchQuery.trim() === '' ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group filtered equipment by category
  const groupedEquipment = filteredEquipment.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, CatalogItem[]>);

  // Get count of items in cart per category
  const getCartCountForCategory = (category: string) => {
    return activeShoot.cart.filter(c => c.category === category).length;
  };

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('camera')) return Camera;
    if (categoryLower.includes('lens')) return Aperture;
    if (categoryLower.includes('light')) return Lightbulb;
    if (categoryLower.includes('sound') || categoryLower.includes('audio')) return Headphones;
    if (categoryLower.includes('grip') || categoryLower.includes('support')) return Clapperboard;
    if (categoryLower.includes('monitor')) return Monitor;
    if (categoryLower.includes('power') || categoryLower.includes('battery')) return Zap;
    if (categoryLower.includes('transport')) return Truck;
    if (categoryLower.includes('assistant') || categoryLower.includes('crew') || categoryLower.includes('gaffer')) return Users;
    if (categoryLower.includes('extra') || categoryLower.includes('accessory')) return Package;
    return Camera;
  };

  const getCategoryColor = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('camera')) return { bg: '#EFF6FF', text: '#2563EB' };
    if (categoryLower.includes('lens')) return { bg: '#F3E8FF', text: '#7C3AED' };
    if (categoryLower.includes('light')) return { bg: '#FEF3C7', text: '#D97706' };
    if (categoryLower.includes('sound') || categoryLower.includes('audio')) return { bg: '#ECFDF5', text: '#059669' };
    if (categoryLower.includes('grip') || categoryLower.includes('support')) return { bg: '#FEE2E2', text: '#DC2626' };
    if (categoryLower.includes('monitor')) return { bg: '#E0E7FF', text: '#4F46E5' };
    if (categoryLower.includes('power') || categoryLower.includes('battery')) return { bg: '#FEF9C3', text: '#CA8A04' };
    if (categoryLower.includes('transport')) return { bg: '#FFEDD5', text: '#EA580C' };
    if (categoryLower.includes('assistant') || categoryLower.includes('crew') || categoryLower.includes('gaffer')) return { bg: '#FCE7F3', text: '#DB2777' };
    if (categoryLower.includes('extra') || categoryLower.includes('accessory')) return { bg: '#F1F5F9', text: '#475569' };
    return { bg: '#F3F4F6', text: '#6B7280' };
  };

  const getSelectionSummary = () => {
    const cart = activeShoot.cart;
    if (cart.length === 0) return 'No items selected';
    if (cart.length === 1) return `1 Item Selected (${cart[0].name})`;
    if (cart.length === 2) return `2 Items Selected (${cart[0].name}, ${cart[1].name})`;
    return `${cart.length} Items Selected (${cart[0].name}, ${cart[1].name.split(' ')[0]}...)`;
  };

  // Check if form is valid
  const isFormValid = () => {
    if (!requestorName || !approvalEmail) return false;
    return shoots.every(shoot => 
      shoot.shootName && shoot.location && shoot.cart.length > 0 && 
      shoot.selectedStartDate && shoot.selectedEndDate
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
        style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-200 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl text-gray-900">Create New Request</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {shoots.length === 1 ? 'Single shoot request' : `${shoots.length} shoots in this request`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Section - Request Details */}
          <div className="w-1/2 flex flex-col bg-white border-r border-gray-200">
            {/* Shared Fields Section */}
            <div className="px-8 py-4 border-b border-gray-100 bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Requestor Name</label>
                <input
                  type="text"
                  value={requestorName}
                  onChange={(e) => setRequestorName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Approval Email</label>
                  <input
                    type="email"
                    value={approvalEmail}
                    onChange={(e) => setApprovalEmail(e.target.value)}
                    placeholder="approver@company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              </div>

            {/* Shoot Tabs */}
            <div className="px-8 py-3 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-2 flex-wrap">
                {shoots.map((shoot, index) => (
                  <div 
                    key={shoot.id}
                    className="flex items-center"
                  >
                    <button
                      onClick={() => setActiveShootIndex(index)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        activeShootIndex === index
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {shoot.shootName ? (
                        <span>{shoot.shootName.length > 15 ? shoot.shootName.substring(0, 15) + '...' : shoot.shootName}</span>
                      ) : (
                        <span>Shoot {index + 1}</span>
                      )}
                    </button>
                    {shoots.length > 1 && (
                      <button
                        onClick={() => removeShoot(index)}
                        className="ml-1 p-1 rounded hover:bg-red-100 transition-colors"
                        title="Remove shoot"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addShoot}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-all flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Shoot
                </button>
              </div>
              
              {/* Copy equipment option */}
              {shoots.length > 1 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Copy equipment from:</span>
                  {shoots.map((shoot, index) => 
                    index !== activeShootIndex && shoot.cart.length > 0 && (
                      <button
                        key={shoot.id}
                        onClick={() => copyEquipmentFrom(index)}
                        className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Shoot {index + 1}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Active Shoot Details */}
            <div className="flex-1 overflow-y-auto px-8 py-4">
              <div className="space-y-4">
              {/* Shoot Name */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Shoot Name</label>
                <input
                  type="text"
                    value={activeShoot.shootName}
                    onChange={(e) => updateActiveShoot('shootName', e.target.value)}
                  placeholder="e.g., Diwali Ad Campaign"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Location */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Location</label>
                <input
                  type="text"
                    value={activeShoot.location}
                    onChange={(e) => updateActiveShoot('location', e.target.value)}
                  placeholder="e.g., Studio 5, Mumbai"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

                {/* Date Selection */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Locked Date Notice for multi-shoots */}
                  {areDatesLocked && (
                    <div className="col-span-2 mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        Dates are locked to match Shoot 1 (same day shoots)
                      </span>
                    </div>
                  )}
                  
                  {/* Start Date */}
                  <div className="relative" ref={startCalendarRef}>
                    <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                      <button
                        type="button"
                        disabled={areDatesLocked}
                        onClick={() => {
                          if (areDatesLocked) return;
                        // If opening calendar and there's a selected date, navigate to that month
                        if (!showStartCalendar && activeShoot.selectedStartDate) {
                          setStartCalendarMonth({ 
                            month: activeShoot.selectedStartDate.month, 
                            year: activeShoot.selectedStartDate.year 
                          });
                        }
                          setShowStartCalendar(!showStartCalendar);
                          setShowEndCalendar(false);
                        }}
                      className={`w-full px-3 py-2.5 border rounded-lg text-left flex items-center justify-between transition-colors ${
                        areDatesLocked 
                          ? 'bg-gray-100 border-gray-200 cursor-not-allowed' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      >
                      <span className={activeShoot.selectedStartDate ? 'text-gray-900' : 'text-gray-400'}>
                        {activeShoot.selectedStartDate ? formatDate(activeShoot.selectedStartDate) : 'Select date'}
                      </span>
                      {areDatesLocked ? (
                        <Lock className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Calendar className="w-4 h-4 text-gray-400" />
                      )}
                      </button>

                    {showStartCalendar && (
                      <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 z-50" style={{ width: '340px' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-gray-900">
                              {monthNames[startCalendarMonth.month]}
                            </span>
                            <span className="text-lg text-gray-400">
                              {startCalendarMonth.year}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (canNavigatePrev(startCalendarMonth)) {
                                  if (startCalendarMonth.month === 0) {
                                    setStartCalendarMonth({ month: 11, year: startCalendarMonth.year - 1 });
                                  } else {
                                    setStartCalendarMonth({ ...startCalendarMonth, month: startCalendarMonth.month - 1 });
                                  }
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${canNavigatePrev(startCalendarMonth) ? 'hover:bg-gray-100' : 'opacity-30 cursor-not-allowed'}`}
                              disabled={!canNavigatePrev(startCalendarMonth)}
                            >
                              <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (startCalendarMonth.month === 11) {
                                  setStartCalendarMonth({ month: 0, year: startCalendarMonth.year + 1 });
                                } else {
                                  setStartCalendarMonth({ ...startCalendarMonth, month: startCalendarMonth.month + 1 });
                                }
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-0 mb-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">{day}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-0">
                          {(() => {
                            const { daysInMonth, startingDayOfWeek } = generateCalendar(startCalendarMonth.month, startCalendarMonth.year);
                            const days: React.ReactNode[] = [];
                            for (let i = 0; i < startingDayOfWeek; i++) {
                              days.push(<div key={`empty-${i}`} />);
                            }
                            for (let day = 1; day <= daysInMonth; day++) {
                              const isDisabled = isDateDisabled(day, startCalendarMonth.month, startCalendarMonth.year);
                              const isSelected = activeShoot.selectedStartDate?.day === day && 
                                               activeShoot.selectedStartDate?.month === startCalendarMonth.month &&
                                               activeShoot.selectedStartDate?.year === startCalendarMonth.year;
                              const isToday = day === currentDay && 
                                             startCalendarMonth.month === currentMonth && 
                                             startCalendarMonth.year === currentYear;
                              days.push(
                                <button
                                  key={day}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => {
                                    updateActiveShoot('selectedStartDate', { day, month: startCalendarMonth.month, year: startCalendarMonth.year });
                                    if (activeShoot.selectedEndDate) {
                                      const newStartTimestamp = new Date(startCalendarMonth.year, startCalendarMonth.month, day).getTime();
                                      const endTimestamp = dateToTimestamp(activeShoot.selectedEndDate);
                                      if (newStartTimestamp > endTimestamp) {
                                        updateActiveShoot('selectedEndDate', null);
                                      }
                                    }
                                    setShowStartCalendar(false);
                                  }}
                                  className={`w-10 h-10 text-sm rounded-full transition-all flex items-center justify-center ${
                                    isDisabled 
                                      ? 'text-gray-300 cursor-not-allowed opacity-50' 
                                      : isSelected
                                        ? 'bg-violet-500 text-white font-medium'
                                        : isToday
                                          ? 'border-2 border-violet-300 text-gray-900 font-medium'
                                          : 'hover:bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            }
                            return days;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* End Date */}
                  <div className="relative" ref={endCalendarRef}>
                    <label className="block text-xs text-gray-500 mb-1">End Date</label>
                      <button
                        type="button"
                        disabled={areDatesLocked}
                        onClick={() => {
                          if (areDatesLocked) return;
                        // If opening calendar and there's a selected date, navigate to that month
                        if (!showEndCalendar && activeShoot.selectedEndDate) {
                          setEndCalendarMonth({ 
                            month: activeShoot.selectedEndDate.month, 
                            year: activeShoot.selectedEndDate.year 
                          });
                        } else if (!showEndCalendar && activeShoot.selectedStartDate) {
                          // If no end date but start date exists, show start date's month
                          setEndCalendarMonth({ 
                            month: activeShoot.selectedStartDate.month, 
                            year: activeShoot.selectedStartDate.year 
                          });
                        }
                          setShowEndCalendar(!showEndCalendar);
                          setShowStartCalendar(false);
                        }}
                      className={`w-full px-3 py-2.5 border rounded-lg text-left flex items-center justify-between transition-colors ${
                        areDatesLocked 
                          ? 'bg-gray-100 border-gray-200 cursor-not-allowed' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      >
                      <span className={activeShoot.selectedEndDate ? 'text-gray-900' : 'text-gray-400'}>
                        {activeShoot.selectedEndDate ? formatDate(activeShoot.selectedEndDate) : 'Select date'}
                      </span>
                      {areDatesLocked ? (
                        <Lock className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Calendar className="w-4 h-4 text-gray-400" />
                      )}
                      </button>

                    {showEndCalendar && (
                      <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 z-50" style={{ width: '340px' }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-gray-900">
                              {monthNames[endCalendarMonth.month]}
                            </span>
                            <span className="text-lg text-gray-400">
                              {endCalendarMonth.year}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (canNavigatePrev(endCalendarMonth)) {
                                  if (endCalendarMonth.month === 0) {
                                    setEndCalendarMonth({ month: 11, year: endCalendarMonth.year - 1 });
                                  } else {
                                    setEndCalendarMonth({ ...endCalendarMonth, month: endCalendarMonth.month - 1 });
                                  }
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${canNavigatePrev(endCalendarMonth) ? 'hover:bg-gray-100' : 'opacity-30 cursor-not-allowed'}`}
                              disabled={!canNavigatePrev(endCalendarMonth)}
                            >
                              <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (endCalendarMonth.month === 11) {
                                  setEndCalendarMonth({ month: 0, year: endCalendarMonth.year + 1 });
                                } else {
                                  setEndCalendarMonth({ ...endCalendarMonth, month: endCalendarMonth.month + 1 });
                                }
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-0 mb-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">{day}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-0">
                          {(() => {
                            const { daysInMonth, startingDayOfWeek } = generateCalendar(endCalendarMonth.month, endCalendarMonth.year);
                            const days: React.ReactNode[] = [];
                            for (let i = 0; i < startingDayOfWeek; i++) {
                              days.push(<div key={`empty-${i}`} />);
                            }
                            for (let day = 1; day <= daysInMonth; day++) {
                              const isDisabled = isDateDisabled(day, endCalendarMonth.month, endCalendarMonth.year, true);
                              const isSelected = activeShoot.selectedEndDate?.day === day && 
                                               activeShoot.selectedEndDate?.month === endCalendarMonth.month &&
                                               activeShoot.selectedEndDate?.year === endCalendarMonth.year;
                              const isToday = day === currentDay && 
                                             endCalendarMonth.month === currentMonth && 
                                             endCalendarMonth.year === currentYear;
                              days.push(
                                <button
                                  key={day}
                                  type="button"
                                  disabled={isDisabled}
                                  onClick={() => {
                                    updateActiveShoot('selectedEndDate', { day, month: endCalendarMonth.month, year: endCalendarMonth.year });
                                    setShowEndCalendar(false);
                                  }}
                                  className={`w-10 h-10 text-sm rounded-full transition-all flex items-center justify-center ${
                                    isDisabled 
                                      ? 'text-gray-300 cursor-not-allowed opacity-50' 
                                      : isSelected
                                        ? 'bg-violet-500 text-white font-medium'
                                        : isToday
                                          ? 'border-2 border-violet-300 text-gray-900 font-medium'
                                          : 'hover:bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            }
                            return days;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shoot Summary Card */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">This Shoot Total</div>
                      <div className="text-xl font-semibold" style={{ color: getBudgetStatus(calculateShootTotal(activeShoot)).color }}>
                        ₹{calculateShootTotal(activeShoot).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Items</div>
                      <div className="text-lg font-medium text-gray-900">
                        {activeShoot.cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Days</div>
                      <div className="text-lg font-medium text-gray-900">
                        {calculateDays(activeShoot)}
                      </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Right Section - Equipment Selection */}
          <div className="w-1/2 flex flex-col bg-white">
            {/* Equipment Selection Header & Search - Fixed */}
            <div className="px-8 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-900 font-medium">Select Equipment</h3>
                <span className="text-sm text-gray-500">{activeShoot.cart.length} selected</span>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search equipment..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Add New Equipment Button */}
              <button
                type="button"
                onClick={() => setShowAddEquipmentModal(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-dashed border-gray-300"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add New Equipment</span>
              </button>
            </div>
            
            {/* Equipment Categories Accordion - Scrollable */}
            <div className="flex-1 overflow-y-auto px-8 py-4">
                    <div className="space-y-3">
                {Object.entries(groupedEquipment).map(([category, items]) => {
                  const isExpanded = expandedCategories.has(category);
                  const cartCount = getCartCountForCategory(category);
                  const CategoryIcon = getCategoryIcon(category);
                  const categoryColor = getCategoryColor(category);
                        
                        return (
                    <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Category Header */}
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: categoryColor.bg }}
                          >
                            <CategoryIcon className="w-4 h-4" style={{ color: categoryColor.text }} />
                          </div>
                          <span className="font-medium text-gray-900">{category}</span>
                          <span className="text-xs text-gray-500">({items.length})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {cartCount > 0 && (
                            <span 
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{ backgroundColor: '#E8F5E9', color: '#27AE60' }}
                            >
                              {cartCount} selected
                            </span>
                          )}
                          <ChevronDown 
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          />
                            </div>
                      </button>
                      
                      {/* Category Items */}
                      {isExpanded && (
                        <div className="p-3 space-y-2 bg-white">
                          {items.map(item => {
                            const isInCart = activeShoot.cart.some(c => c.id === item.id);
                            
                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                              >
                            {/* Item Info */}
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-900 text-sm">{item.name}</div>
                                  <div className="text-gray-500 text-xs">₹{item.dailyRate.toLocaleString()}/day</div>
                            </div>
                            
                                {/* Add/Remove Buttons with Quantity Controls */}
                            {isInCart ? (
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {/* Decrease Button */}
                                    <button
                                      type="button"
                                      onClick={() => decreaseQuantity(item.id)}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-gray-100"
                                      style={{ border: '1px solid #E5E7EB' }}
                                      title="Decrease quantity"
                                    >
                                      <span className="text-gray-600 text-lg font-medium">−</span>
                                    </button>
                                    
                                    {/* Quantity Display */}
                                    <div 
                                      className="w-10 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
                                  style={{ backgroundColor: '#E8F5E9', color: '#27AE60' }}
                                >
                                      {getCartQuantity(item.id)}
                                    </div>
                                    
                                    {/* Increase Button */}
                                <button
                                  type="button"
                                      onClick={() => addToCart(item)}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                                      style={{ backgroundColor: '#2D60FF', color: 'white' }}
                                      title="Increase quantity"
                                    >
                                      <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addToCart(item)}
                                    className="px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs transition-all flex-shrink-0"
                                style={{ backgroundColor: '#2D60FF', color: 'white' }}
                              >
                                    <Plus className="w-3 h-3" />
                                Add
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                      )}
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-200 bg-white flex items-center gap-6">
          {/* Shoots Summary - Clickable */}
          {shoots.length > 1 && (
            <div className="flex items-center gap-2">
              {shoots.map((shoot, index) => (
                <button 
                  key={shoot.id}
                  type="button"
                  onClick={() => setActiveShootIndex(index)}
                  className={`text-center px-4 py-2 rounded-lg transition-all cursor-pointer ${
                    index === activeShootIndex 
                      ? 'ring-2 ring-blue-500 ring-offset-1' 
                      : 'hover:bg-gray-100'
                  }`}
                  style={{ backgroundColor: index === activeShootIndex ? '#EFF6FF' : '#F9FAFB' }}
                >
                  <div className="text-xs text-gray-500">Shoot {index + 1}</div>
                  <div className="text-sm font-medium text-gray-900">
                    ₹{calculateShootTotal(shoot).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          <div className="flex-1" />
          
          {/* Grand Total with Budget Status */}
          <div className="text-right">
            {(() => {
              const total = calculateGrandTotal();
              const status = getBudgetStatus(total);
              const StatusIcon = status.Icon;
              return (
                <>
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <StatusIcon className="w-4 h-4" style={{ color: status.color }} />
                    <span 
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: status.bgColor, color: status.color }}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {shoots.length > 1 ? 'Grand Total' : 'Total'}
                  </div>
                  <div className="text-2xl font-semibold" style={{ color: status.color }}>
                    ₹{total.toLocaleString()}
            </div>
                </>
              );
            })()}
          </div>
          
          {/* Submit Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isSubmitting && isFormValid()) {
                handleSubmit(e);
              }
            }}
            disabled={!isFormValid() || isSubmitting}
            className="px-8 py-3 rounded-full text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium hover:opacity-90"
            style={{ backgroundColor: '#2D60FF' }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Submitting...
              </span>
            ) : (
              shoots.length > 1 ? `Submit ${shoots.length} Shoots` : 'Submit Request'
            )}
          </button>
        </div>
      </div>
      
      {/* Add New Equipment Modal */}
      {showAddEquipmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Add New Equipment</h3>
              <button 
                onClick={() => {
                  setShowAddEquipmentModal(false);
                  setNewEquipment({ name: '', category: 'Camera', dailyRate: 0, customCategory: '' });
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Equipment Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name *</label>
                <input
                  type="text"
                  value={newEquipment.name}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Sony A7S III"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={newEquipment.category}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {equipmentCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                
                {/* Custom Category Input */}
                {newEquipment.category === 'Other' && (
                  <input
                    type="text"
                    value={newEquipment.customCategory}
                    onChange={(e) => setNewEquipment(prev => ({ ...prev, customCategory: e.target.value }))}
                    placeholder="Enter custom category name"
                    className="w-full px-4 py-3 mt-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
              
              {/* Daily Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate (₹) *</label>
                <input
                  type="number"
                  value={newEquipment.dailyRate || ''}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, dailyRate: Number(e.target.value) }))}
                  placeholder="e.g. 1500"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddEquipmentModal(false);
                  setNewEquipment({ name: '', category: 'Camera', dailyRate: 0, customCategory: '' });
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNewEquipment}
                disabled={!newEquipment.name.trim() || newEquipment.dailyRate <= 0 || (newEquipment.category === 'Other' && !newEquipment.customCategory.trim())}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Cart & Catalog
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-3 text-center">
              This equipment will be added to the catalog for future use
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
