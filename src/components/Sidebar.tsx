import { Film, CheckCircle2, Wallet, Archive, User, Package } from 'lucide-react';

interface SidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
  notificationCounts?: {
    active?: number;
    approvals?: number;
    finance?: number;
  };
}

export function Sidebar({ activeMenu, onMenuChange, notificationCounts = {} }: SidebarProps) {
  const menuItems = [
    { id: 'active', label: 'Active Shoots', icon: Film, count: notificationCounts.active },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle2, count: notificationCounts.approvals },
    { id: 'finance', label: 'Finance/Invoices', icon: Wallet, count: notificationCounts.finance },
    { id: 'catalog', label: 'Catalog', icon: Package },
    { id: 'archive', label: 'Archive', icon: Archive },
  ];

  return (
    <div className="w-64 h-screen bg-white flex flex-col" style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.05)' }}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#2D60FF' }}>
            <Film className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl">ShootFlow</span>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onMenuChange(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all relative"
              style={{
                backgroundColor: isActive ? '#EEF2FF' : 'transparent',
                color: isActive ? '#2D60FF' : '#64748B',
              }}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.count && item.count > 0 && (
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  {item.count}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm">Anish Kumar</div>
            <div className="text-xs text-gray-500">Production Manager</div>
          </div>
        </div>
      </div>
    </div>
  );
}