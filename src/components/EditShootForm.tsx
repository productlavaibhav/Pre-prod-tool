import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, ArrowLeft, Package, Edit3, DollarSign, ChevronDown, Search, Camera, Aperture, Lightbulb, Headphones, Clapperboard, Monitor, Zap, Truck, Users, Check } from 'lucide-react';
import type { Shoot, Equipment } from '../App';
import type { CatalogItem } from './EquipmentCatalogManager';

interface EditShootFormProps {
  shoot: Shoot;
  relatedShoots?: Shoot[];
  catalogItems: CatalogItem[];
  onSave: (shootId: string, updatedEquipment: Equipment[], updatedVendorQuote?: { amount: number; notes: string }) => void;
  onClose: () => void;
}

interface EditableEquipment extends Equipment {
  editedVendorRate?: number;
  isEditing?: boolean;
  isNew?: boolean;
  originalVendorRate?: number;
}

export function EditShootForm({ shoot, relatedShoots = [], catalogItems, onSave, onClose }: EditShootFormProps) {
  const allShoots = [shoot, ...relatedShoots];
  const isMultiShoot = allShoots.length > 1;
  
  const [activeShootIndex, setActiveShootIndex] = useState(0);
  const [shootsData, setShootsData] = useState<{ [shootId: string]: EditableEquipment[] }>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingPrices, setEditingPrices] = useState(false);

  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('camera')) return Camera;
    if (categoryLower.includes('lens')) return Aperture;
    if (categoryLower.includes('light')) return Lightbulb;
    if (categoryLower.includes('sound') || categoryLower.includes('audio')) return Headphones;
    if (categoryLower.includes('grip') || categoryLower.includes('support') || categoryLower.includes('tripod')) return Clapperboard;
    if (categoryLower.includes('monitor')) return Monitor;
    if (categoryLower.includes('power') || categoryLower.includes('battery')) return Zap;
    if (categoryLower.includes('transport')) return Truck;
    if (categoryLower.includes('assistant') || categoryLower.includes('crew') || categoryLower.includes('gaffer')) return Users;
    return Package;
  };

  const getCategoryColor = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('camera')) return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    if (categoryLower.includes('lens')) return { bg: '#F3E8FF', text: '#7C3AED', border: '#DDD6FE' };
    if (categoryLower.includes('light')) return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
    if (categoryLower.includes('sound') || categoryLower.includes('audio')) return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
    if (categoryLower.includes('grip') || categoryLower.includes('support') || categoryLower.includes('tripod')) return { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' };
    if (categoryLower.includes('monitor')) return { bg: '#E0E7FF', text: '#4F46E5', border: '#C7D2FE' };
    if (categoryLower.includes('power') || categoryLower.includes('battery')) return { bg: '#FEF9C3', text: '#CA8A04', border: '#FEF08A' };
    if (categoryLower.includes('transport')) return { bg: '#FFEDD5', text: '#EA580C', border: '#FED7AA' };
    if (categoryLower.includes('assistant') || categoryLower.includes('crew') || categoryLower.includes('gaffer')) return { bg: '#FCE7F3', text: '#DB2777', border: '#FBCFE8' };
    return { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' };
  };

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

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const matchingCategories = new Set<string>();
      catalogItems.forEach(item => {
        if (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase())) {
          matchingCategories.add(item.category);
        }
      });
      setExpandedCategories(matchingCategories);
    } else if (searchQuery.trim().length === 0) {
      setExpandedCategories(new Set());
    }
  }, [searchQuery, catalogItems]);

  useEffect(() => {
    const initialData: { [shootId: string]: EditableEquipment[] } = {};
    allShoots.forEach(s => {
      initialData[s.id] = s.equipment.map(eq => ({
        ...eq,
        editedVendorRate: eq.vendorRate,
        originalVendorRate: eq.vendorRate,
        isEditing: false,
        isNew: eq.isNew || false,
      }));
    });
    setShootsData(initialData);
  }, [shoot.id, relatedShoots.length]);

  const currentShoot = allShoots[activeShootIndex];
  const currentEquipment = shootsData[currentShoot?.id] || [];

  const getAvailableCatalogItems = () => {
    const addedIds = new Set(currentEquipment.map(eq => eq.id));
    return catalogItems.filter(item => {
      const matchesSearch = searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const notAlreadyAdded = !addedIds.has(item.id);
      return matchesSearch && notAlreadyAdded;
    });
  };

  const availableCatalogItems = getAvailableCatalogItems();

  const groupedEquipment = availableCatalogItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, CatalogItem[]>);

  const addEquipment = (item: CatalogItem) => {
    const newEquipment: EditableEquipment = {
      id: item.id,
      name: item.name,
      dailyRate: item.dailyRate,
      quantity: 1,
      category: item.category,
      expectedRate: item.dailyRate,
      vendorRate: item.dailyRate,
      editedVendorRate: item.dailyRate,
      originalVendorRate: undefined,
      isNew: true,
    };
    setShootsData(prev => ({
      ...prev,
      [currentShoot.id]: [...(prev[currentShoot.id] || []), newEquipment],
    }));
  };

  const removeEquipment = (itemId: string) => {
    setShootsData(prev => ({
      ...prev,
      [currentShoot.id]: (prev[currentShoot.id] || []).filter(eq => eq.id !== itemId),
    }));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setShootsData(prev => ({
      ...prev,
      [currentShoot.id]: (prev[currentShoot.id] || []).map(eq =>
        eq.id === itemId ? { ...eq, quantity } : eq
      ),
    }));
  };

  const updateVendorRate = (itemId: string, rate: number) => {
    setShootsData(prev => ({
      ...prev,
      [currentShoot.id]: (prev[currentShoot.id] || []).map(eq =>
        eq.id === itemId ? { ...eq, editedVendorRate: rate } : eq
      ),
    }));
  };

  const calculateShootTotal = (shootId: string) => {
    const equipment = shootsData[shootId] || [];
    const vendorTotal = equipment.reduce((sum, eq) => {
      const rate = eq.vendorRate || eq.dailyRate || 0;
      return sum + (rate * (eq.quantity || 1));
    }, 0);
    const editedTotal = equipment.reduce((sum, eq) => {
      const rate = eq.editedVendorRate || eq.vendorRate || eq.dailyRate || 0;
      return sum + (rate * (eq.quantity || 1));
    }, 0);
    return { vendorTotal, editedTotal };
  };

  const calculateGrandTotal = () => {
    let vendorTotal = 0;
    let editedTotal = 0;
    allShoots.forEach(s => {
      const { vendorTotal: vt, editedTotal: et } = calculateShootTotal(s.id);
      vendorTotal += vt;
      editedTotal += et;
    });
    return { vendorTotal, editedTotal };
  };

  const handleSave = () => {
    allShoots.forEach(s => {
      const equipment = (shootsData[s.id] || []).map(eq => ({
        ...eq,
        vendorRate: eq.editedVendorRate || eq.vendorRate,
        isNew: eq.isNew,
        isEditing: undefined,
        editedVendorRate: undefined,
        originalVendorRate: undefined,
      }));
      const { editedTotal } = calculateShootTotal(s.id);
      const updatedQuote = s.vendorQuote 
        ? { ...s.vendorQuote, amount: editedTotal }
        : { amount: editedTotal, notes: 'Updated by admin' };
      onSave(s.id, equipment as Equipment[], updatedQuote);
    });
    onClose();
  };

  const totalItems = currentEquipment.reduce((sum, eq) => sum + (eq.quantity || 1), 0);
  const { vendorTotal, editedTotal } = calculateShootTotal(currentShoot?.id || '');
  const grandTotals = calculateGrandTotal();
  const newItemsCount = currentEquipment.filter(eq => eq.isNew).length;

  const isItemAdded = (itemId: string) => currentEquipment.some(eq => eq.id === itemId);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F7FA' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto">
          {/* Top row - Title and Desktop buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-base sm:text-xl font-semibold text-gray-900">Edit Active Shoot</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                  {isMultiShoot ? `${allShoots.length} Shoots in Request` : currentShoot?.name} • {currentShoot?.date}
                </p>
              </div>
            </div>
            
            {/* Desktop buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => setEditingPrices(!editingPrices)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium ${
                  editingPrices 
                    ? 'bg-orange-100 text-orange-700 border border-orange-300' 
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                {editingPrices ? 'Editing Prices' : 'Edit Prices'}
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 rounded-lg text-white flex items-center gap-2 transition-colors hover:opacity-90 text-sm font-medium"
                style={{ backgroundColor: '#27AE60' }}
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
          
          {/* Mobile buttons */}
          <div className="flex md:hidden items-center gap-2 mt-3">
            <button
              onClick={() => setEditingPrices(!editingPrices)}
              className={`flex-1 px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs font-medium ${
                editingPrices 
                  ? 'bg-orange-100 text-orange-700 border border-orange-300' 
                  : 'border border-gray-300 text-gray-700'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              {editingPrices ? 'Editing' : 'Edit Prices'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-2 rounded-lg text-white flex items-center justify-center gap-1.5 text-xs font-medium"
              style={{ backgroundColor: '#27AE60' }}
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Currently Editing Banner */}
      <div style={{ backgroundColor: '#E8F4FD' }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ffffff', border: '2px solid #B8D4E8' }}>
                <span className="text-base sm:text-lg font-bold" style={{ color: '#2D6A9F' }}>{activeShootIndex + 1}</span>
              </div>
              <div>
                <div className="text-[10px] sm:text-xs font-medium" style={{ color: '#5A9BCF' }}>Currently Editing</div>
                <div className="text-sm sm:text-lg font-bold" style={{ color: '#1E3A5F' }}>{currentShoot?.name || `Shoot ${activeShootIndex + 1}`}</div>
                <div className="text-xs sm:text-sm hidden sm:block" style={{ color: '#4A7BA7' }}>{currentShoot?.date} • {currentShoot?.location}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] sm:text-xs font-medium" style={{ color: '#5A9BCF' }}>Total</div>
              <div className="text-lg sm:text-2xl font-bold" style={{ color: '#1E3A5F' }}>₹{vendorTotal.toLocaleString()}</div>
              <div className="text-xs sm:text-sm" style={{ color: '#4A7BA7' }}>{totalItems} items</div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-shoot Tabs */}
      {isMultiShoot && (
        <div style={{ backgroundColor: '#F5F7FA', borderBottom: '1px solid #E0E6ED' }}>
          <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 sm:py-3">
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg flex-shrink-0" style={{ backgroundColor: '#ffffff', border: '1px solid #D0D7DE' }}>
                <span className="text-sm font-medium" style={{ color: '#4A5568' }}>Switch:</span>
              </div>
              {allShoots.map((s, index) => {
                const { vendorTotal: vt } = calculateShootTotal(s.id);
                const isActive = activeShootIndex === index;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveShootIndex(index)}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm transition-all flex items-center gap-2 sm:gap-3 flex-shrink-0"
                    style={{
                      backgroundColor: isActive ? '#E8F4FD' : '#ffffff',
                      border: isActive ? '2px solid #5A9BCF' : '1px solid #D0D7DE',
                    }}
                  >
                    <span 
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-[10px] sm:text-xs font-bold"
                      style={{
                        backgroundColor: isActive ? '#5A9BCF' : '#E8F4FD',
                        color: isActive ? '#ffffff' : '#5A9BCF',
                      }}
                    >
                      {index + 1}
                    </span>
                    <div className="text-left">
                      <div className="font-semibold truncate max-w-[80px] sm:max-w-none" style={{ color: '#1E3A5F' }}>
                        {s.name || `Shoot ${index + 1}`}
                      </div>
                      <div className="text-[10px] sm:text-xs hidden sm:block" style={{ color: '#6B7280' }}>
                        {s.date}
                      </div>
                    </div>
                    <span 
                      className="text-xs sm:text-sm font-semibold px-1.5 sm:px-2 py-0.5 rounded"
                      style={{ backgroundColor: '#F0F4F8', color: '#1E3A5F' }}
                    >
                      ₹{vt.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-6xl mx-auto p-3 sm:p-6">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Equipment List */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #E0E6ED' }}>
              <div>
                <h2 className="font-semibold text-sm sm:text-base" style={{ color: '#1E3A5F' }}>Equipment List</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs sm:text-sm" style={{ color: '#6B7280' }}>{totalItems} items</span>
                  {newItemsCount > 0 && (
                    <span className="text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                      +{newItemsCount} new
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-all text-xs sm:text-sm font-medium w-full sm:w-auto"
                style={{ backgroundColor: '#5A9BCF', color: '#ffffff' }}
              >
                <Plus className="w-4 h-4" />
                Add Equipment
              </button>
            </div>

            {currentEquipment.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-200 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-500 mb-3 text-sm sm:text-base">No equipment added yet</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Add Equipment
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[400px] sm:max-h-[450px] overflow-y-auto">
                {currentEquipment.map((item) => {
                  const currentRate = item.vendorRate || item.dailyRate || 0;
                  const isNewItem = item.isNew === true;
                  
                  return (
                    <div 
                      key={item.id} 
                      className="px-3 sm:px-6 py-3 sm:py-4"
                      style={{ 
                        backgroundColor: isNewItem ? '#FEF9E7' : '#ffffff',
                      }}
                    >
                      {/* Mobile Layout */}
                      <div className="flex flex-col gap-2 sm:hidden">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm" style={{ color: isNewItem ? '#92400E' : '#1E3A5F' }}>
                              {item.name}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: isNewItem ? '#B45309' : '#6B7280' }}>
                              {item.category}
                              {isNewItem && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: '#FDE68A', color: '#92400E' }}>
                                  Added by Admin
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeEquipment(item.id)}
                            className="p-1.5 rounded transition-colors hover:bg-red-50"
                            style={{ color: '#9CA3AF' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateQuantity(item.id, (item.quantity || 1) - 1);
                              }}
                              className="w-7 h-7 rounded flex items-center justify-center text-sm font-medium"
                              style={{ border: '1px solid #D0D7DE', backgroundColor: '#ffffff', color: '#4B5563' }}
                              disabled={(item.quantity || 1) <= 1}
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-sm font-semibold" style={{ color: '#1E3A5F' }}>
                              {item.quantity || 1}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateQuantity(item.id, (item.quantity || 1) + 1);
                              }}
                              className="w-7 h-7 rounded flex items-center justify-center text-sm font-medium"
                              style={{ border: '1px solid #D0D7DE', backgroundColor: '#ffffff', color: '#4B5563' }}
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right">
                            {editingPrices ? (
                              <input
                                type="number"
                                value={item.editedVendorRate ?? currentRate}
                                onChange={(e) => updateVendorRate(item.id, Number(e.target.value))}
                                className="w-20 px-2 py-1 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                                style={{ border: '1px solid #D0D7DE', backgroundColor: '#ffffff', color: '#1E3A5F' }}
                              />
                            ) : (
                              <div className="font-semibold text-sm" style={{ color: '#1E3A5F' }}>
                                ₹{currentRate.toLocaleString()}
                              </div>
                            )}
                            <div className="text-[10px]" style={{ color: '#9CA3AF' }}>per unit</div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm" style={{ color: isNewItem ? '#92400E' : '#1E3A5F' }}>
                            {item.name}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: isNewItem ? '#B45309' : '#6B7280' }}>
                            {item.category}
                            {isNewItem && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#FDE68A', color: '#92400E' }}>
                                Added by Admin
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center gap-1" style={{ width: '90px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              updateQuantity(item.id, (item.quantity || 1) - 1);
                            }}
                            className="w-7 h-7 rounded flex items-center justify-center text-sm font-medium cursor-pointer hover:bg-gray-100"
                            style={{ border: '1px solid #D0D7DE', backgroundColor: '#ffffff', color: '#4B5563' }}
                            disabled={(item.quantity || 1) <= 1}
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-semibold" style={{ color: '#1E3A5F' }}>
                            {item.quantity || 1}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              updateQuantity(item.id, (item.quantity || 1) + 1);
                            }}
                            className="w-7 h-7 rounded flex items-center justify-center text-sm font-medium cursor-pointer hover:bg-gray-100"
                            style={{ border: '1px solid #D0D7DE', backgroundColor: '#ffffff', color: '#4B5563' }}
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right" style={{ width: '90px' }}>
                          {editingPrices ? (
                            <input
                              type="number"
                              value={item.editedVendorRate ?? currentRate}
                              onChange={(e) => updateVendorRate(item.id, Number(e.target.value))}
                              className="w-full px-2 py-1 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                              style={{ border: '1px solid #D0D7DE', backgroundColor: '#ffffff', color: '#1E3A5F' }}
                            />
                          ) : (
                            <div className="font-semibold text-sm" style={{ color: '#1E3A5F' }}>
                              ₹{currentRate.toLocaleString()}
                            </div>
                          )}
                          <div className="text-xs" style={{ color: '#9CA3AF' }}>per unit</div>
                        </div>
                        
                        <button
                          onClick={() => removeEquipment(item.id)}
                          className="p-1.5 rounded transition-colors hover:bg-red-50"
                          style={{ color: '#9CA3AF' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary Panel */}
          <div className="space-y-3 sm:space-y-4">
            <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #E0E6ED' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8F4FD' }}>
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#5A9BCF' }} />
                </div>
                <h3 className="font-semibold text-sm sm:text-base" style={{ color: '#1E3A5F' }}>Total</h3>
              </div>
              <div className="text-xl sm:text-2xl font-bold mb-1" style={{ color: '#1E3A5F' }}>
                ₹{(editingPrices ? editedTotal : vendorTotal).toLocaleString()}
              </div>
              <div className="text-xs sm:text-sm" style={{ color: '#6B7280' }}>
                {totalItems} items
              </div>
            </div>

            {isMultiShoot && (
              <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #E0E6ED' }}>
                <h3 className="font-semibold mb-3 text-sm sm:text-base" style={{ color: '#1E3A5F' }}>All Shoots Total</h3>
                {allShoots.map((s, idx) => {
                  const { vendorTotal: vt } = calculateShootTotal(s.id);
                  return (
                    <div key={s.id} className="flex justify-between text-xs sm:text-sm py-1.5 sm:py-2" style={{ borderBottom: '1px solid #E0E6ED' }}>
                      <span style={{ color: '#4B5563' }}>{s.name || `Shoot ${idx + 1}`}</span>
                      <span className="font-medium" style={{ color: '#1E3A5F' }}>₹{vt.toLocaleString()}</span>
                    </div>
                  );
                })}
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 flex justify-between items-center" style={{ borderTop: '2px solid #E0E6ED' }}>
                  <span className="font-semibold text-sm sm:text-base" style={{ color: '#1E3A5F' }}>Grand Total</span>
                  <span className="text-lg sm:text-xl font-bold" style={{ color: '#1E3A5F' }}>₹{grandTotals.vendorTotal.toLocaleString()}</span>
                </div>
              </div>
            )}

            {newItemsCount > 0 && (
              <div className="p-3 sm:p-4 rounded-xl" style={{ backgroundColor: '#FEF9E7', border: '1px solid #FDE68A' }}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm" style={{ backgroundColor: '#FDE68A', color: '#92400E' }}>
                    {newItemsCount}
                  </span>
                  <div>
                    <p className="font-medium text-xs sm:text-sm" style={{ color: '#92400E' }}>New Item(s) Added</p>
                    <p className="text-[10px] sm:text-xs" style={{ color: '#B45309' }}>Added by Admin</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl flex flex-col shadow-2xl" style={{ maxHeight: '90vh' }}>
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Add Equipment</h3>
                <p className="text-xs sm:text-sm text-gray-500">Select items to add</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery('');
                  setExpandedCategories(new Set());
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search equipment..."
                  className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Equipment List */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {Object.keys(groupedEquipment).length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-200 mx-auto mb-3 sm:mb-4" />
                  <p className="text-gray-500 font-medium text-sm sm:text-base">No equipment available</p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-1">
                    {searchQuery ? 'Try a different search term' : 'All items have been added'}
                  </p>
                </div>
              ) : (
                <div className="p-3 sm:p-4 space-y-2">
                  {Object.entries(groupedEquipment).map(([category, items]) => {
                    const isExpanded = expandedCategories.has(category);
                    const CategoryIcon = getCategoryIcon(category);
                    const colors = getCategoryColor(category);
                    
                    return (
                      <div 
                        key={category} 
                        className="border rounded-xl overflow-hidden"
                        style={{ borderColor: isExpanded ? colors.border : '#E5E7EB' }}
                      >
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full px-3 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between transition-colors"
                          style={{ backgroundColor: isExpanded ? colors.bg : 'white' }}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div 
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: isExpanded ? 'white' : colors.bg }}
                            >
                              <CategoryIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: colors.text }} />
                            </div>
                            <div className="text-left">
                              <span className="font-semibold text-gray-900 text-sm sm:text-base">{category}</span>
                              <span className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs text-gray-500 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded-full">
                                {items.length}
                              </span>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isExpanded && (
                          <div className="p-2 sm:p-3 space-y-2 bg-gray-50 border-t" style={{ borderColor: colors.border }}>
                            {items.map(item => {
                              const alreadyAdded = isItemAdded(item.id);
                              return (
                                <div
                                  key={item.id}
                                  className={`flex items-center justify-between p-2.5 sm:p-3 bg-white border rounded-lg transition-all ${
                                    alreadyAdded ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 text-xs sm:text-sm truncate">{item.name}</div>
                                    <div className="text-[10px] sm:text-sm text-gray-500">₹{item.dailyRate?.toLocaleString()}/day</div>
                                  </div>
                                  {alreadyAdded ? (
                                    <div className="flex items-center gap-1 text-green-600 text-xs sm:text-sm font-medium ml-2">
                                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      <span className="hidden sm:inline">Added</span>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => addEquipment(item)}
                                      className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-white transition-all flex items-center gap-1 ml-2"
                                      style={{ backgroundColor: '#2D60FF' }}
                                    >
                                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {newItemsCount > 0 && (
                    <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2">
                      <span className="w-4 h-4 sm:w-5 sm:h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] sm:text-xs">
                        {newItemsCount}
                      </span>
                      <span className="hidden sm:inline">new item(s) added</span>
                      <span className="sm:hidden">new</span>
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSearchQuery('');
                    setExpandedCategories(new Set());
                  }}
                  className="px-5 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
