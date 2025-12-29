import { useState } from 'react';
import { 
  LayoutDashboard, 
  CheckCircle, 
  DollarSign, 
  Package, 
  Archive,
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface CatalogItem {
  id: string;
  name: string;
  dailyRate: number;
  category: string;
  lastUpdated: string;
}

interface EquipmentCatalogManagerProps {
  catalogItems: CatalogItem[];
  onUpdateCatalog: (items: CatalogItem[]) => void;
  onBack: () => void;
  onOpenApprovals: () => void;
  onOpenFinance: () => void;
  onOpenArchive: () => void;
  approvalsPending?: number;
}

export function EquipmentCatalogManager({ 
  catalogItems, 
  onUpdateCatalog, 
  onBack,
  onOpenApprovals,
  onOpenFinance,
  onOpenArchive,
  approvalsPending = 0
}: EquipmentCatalogManagerProps) {
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Form state for editing/adding
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formRate, setFormRate] = useState('');
  const [customCategory, setCustomCategory] = useState(''); // For "Other" category

  const categories = ['all', 'Camera', 'Lens', 'Light', 'Tripod', 'Audio', 'Small Equipments', 'Extra', 'Assistant', 'Gaffer', 'Transport', 'Other'];

  const openEditDrawer = (item: CatalogItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormRate(item.dailyRate.toString());
    setShowDrawer(true);
  };

  const openAddDialog = () => {
    setFormName('');
    setFormCategory('Camera');
    setFormRate('');
    setShowAddDialog(true);
  };

  const handleSaveEdit = () => {
    if (editingItem && formName && formRate) {
      const updated = catalogItems.map(item =>
        item.id === editingItem.id
          ? { ...item, name: formName, category: formCategory, dailyRate: parseInt(formRate), lastUpdated: 'Today' }
          : item
      );
      onUpdateCatalog(updated);
      setShowDrawer(false);
      setEditingItem(null);
    }
  };

  const handleAddItem = () => {
    // Use custom category if "Other" is selected
    const finalCategory = formCategory === 'Other' ? customCategory : formCategory;
    
    if (formName && finalCategory && formRate) {
      const newItem: CatalogItem = {
        id: Date.now().toString(),
        name: formName,
        category: finalCategory,
        dailyRate: parseInt(formRate),
        lastUpdated: 'Today'
      };
      onUpdateCatalog([...catalogItems, newItem]);
      setShowAddDialog(false);
      setCustomCategory(''); // Reset custom category
    }
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      onUpdateCatalog(catalogItems.filter(item => item.id !== id));
    }
  };

  const filteredItems = catalogItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalItems = catalogItems.length;
  const categoryCounts = categories.reduce((acc, cat) => {
    if (cat === 'all') {
      acc[cat] = catalogItems.length;
    } else {
      acc[cat] = catalogItems.filter(item => item.category === cat).length;
    }
    return acc;
  }, {} as Record<string, number>);

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
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors"
            style={{ backgroundColor: '#2D60FF', color: 'white' }}
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
              <h1 className="text-gray-900 text-2xl font-semibold">Equipment Catalog</h1>
              <p className="text-gray-500 text-sm">Manage your equipment database</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Total Items</div>
                <div className="text-xl font-semibold" style={{ color: '#2D60FF' }}>{totalItems}</div>
              </div>
              <button
                onClick={openAddDialog}
                className="px-5 py-2.5 rounded-lg text-white flex items-center gap-2 transition-colors font-medium hover:opacity-90"
                style={{ backgroundColor: '#2D60FF' }}
              >
                <Plus className="w-5 h-5" />
                Add Equipment
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center gap-4 overflow-x-auto">
            {categories.slice(0, 7).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: selectedCategory === cat ? '#EFF6FF' : 'transparent',
                  color: selectedCategory === cat ? '#2D60FF' : '#6B7280'
                }}
              >
                {cat === 'all' ? 'All' : cat}
                <span className="ml-1.5 text-xs opacity-70">({categoryCounts[cat]})</span>
              </button>
            ))}
            <div className="ml-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search equipment..."
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* Equipment Table */}
        <div className="px-8 py-8">
          <div 
            className="bg-white rounded-xl border border-gray-200"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Item Name</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Daily Rate</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Last Updated</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-900">{item.name}</td>
                      <td className="px-6 py-4">
                        <span 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs"
                          style={{ backgroundColor: '#EFF6FF', color: '#2D60FF' }}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium" style={{ color: '#27AE60' }}>
                        ₹{item.dailyRate.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{item.lastUpdated}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditDrawer(item)}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No equipment found matching your search.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Side Drawer for Editing */}
      {showDrawer && editingItem && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setShowDrawer(false)}
          />
          
          {/* Drawer */}
          <div 
            className="fixed top-0 right-0 h-full bg-white w-full max-w-md z-50 shadow-2xl overflow-y-auto"
            style={{ boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }}
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Edit Equipment</h3>
                <button 
                  onClick={() => setShowDrawer(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="px-6 py-6 space-y-5">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Item Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Camera</option>
                  <option>Lens</option>
                  <option>Light</option>
                  <option>Tripod</option>
                  <option>Audio</option>
                  <option>Small Equipments</option>
                  <option>Extra</option>
                  <option>Assistant</option>
                  <option>Gaffer</option>
                  <option>Transport</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Daily Rate (₹)</label>
                <input
                  type="number"
                  value={formRate}
                  onChange={(e) => setFormRate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDrawer(false)}
                  className="flex-1 px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-5 py-2.5 rounded-lg text-white transition-colors font-medium hover:opacity-90"
                  style={{ backgroundColor: '#2D60FF' }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add New Item Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
          <div 
            className="bg-white rounded-2xl p-6 w-full"
            style={{ maxWidth: '450px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Add New Equipment</h3>
              <button 
                onClick={() => setShowAddDialog(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Item Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Sony A7S III"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => {
                    setFormCategory(e.target.value);
                    if (e.target.value !== 'Other') setCustomCategory('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Camera</option>
                  <option>Lens</option>
                  <option>Light</option>
                  <option>Tripod</option>
                  <option>Audio</option>
                  <option>Small Equipments</option>
                  <option>Extra</option>
                  <option>Assistant</option>
                  <option>Gaffer</option>
                  <option>Transport</option>
                  <option>Other</option>
                </select>
              </div>

              {/* Custom category input when "Other" is selected */}
              {formCategory === 'Other' && (
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Custom Category Name</label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter your category name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">Daily Rate (₹)</label>
                <input
                  type="number"
                  value={formRate}
                  onChange={(e) => setFormRate(e.target.value)}
                  placeholder="1500"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddDialog(false)}
                className="flex-1 px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={!formName || !formRate || (formCategory === 'Other' && !customCategory)}
                className="flex-1 px-5 py-2.5 rounded-lg text-white disabled:opacity-50 font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: '#2D60FF' }}
              >
                Add Equipment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
