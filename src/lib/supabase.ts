// API Configuration for Railway PostgreSQL Backend
const API_URL = import.meta.env.VITE_API_URL || '';

// Check if API is configured
export const isSupabaseConfigured = () => {
  return API_URL && API_URL !== '';
};

// Dummy supabase object for compatibility (not used with Railway)
export const supabase = {
  from: () => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ error: null }),
    upsert: () => Promise.resolve({ error: null }),
  })
};

// API helper functions
async function apiCall(endpoint: string, options?: RequestInit) {
  if (!API_URL) {
    console.warn('API URL not configured');
    return null;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    return null;
  }
}

// Database types
export interface DbShoot {
  id: string;
  name: string;
  date: string;
  duration: string;
  location: string;
  equipment: any[];
  status: string;
  requestor: any;
  vendor_quote?: any;
  approved?: boolean;
  approved_amount?: number;
  invoice_file?: any;
  paid?: boolean;
  rejection_reason?: string;
  approval_email?: string;
  cancellation_reason?: string;
  activities?: any[];
  email_thread_id?: string;
  created_at?: string;
  shoot_date?: string;
  request_group_id?: string;
  is_multi_shoot?: boolean;
  multi_shoot_index?: number;
  total_shoots_in_request?: number;
}

export interface DbCatalogItem {
  id: string;
  name: string;
  daily_rate: number;
  category: string;
  last_updated?: string;
}

// Database operations for Shoots
export const shootsDb = {
  async getAll(): Promise<DbShoot[]> {
    const data = await apiCall('/api/shoots');
    return data || [];
  },

  async create(shoot: DbShoot): Promise<DbShoot | null> {
    return await apiCall('/api/shoots', {
      method: 'POST',
      body: JSON.stringify(shoot),
    });
  },

  async update(id: string, updates: Partial<DbShoot>): Promise<DbShoot | null> {
    return await apiCall('/api/shoots', {
      method: 'POST',
      body: JSON.stringify({ id, ...updates }),
    });
  },

  async delete(id: string): Promise<boolean> {
    const result = await apiCall(`/api/shoots/${id}`, {
      method: 'DELETE',
    });
    return result?.success || false;
  }
};

// Database operations for Catalog
export const catalogDb = {
  async getAll(): Promise<DbCatalogItem[]> {
    const data = await apiCall('/api/catalog');
    return data || [];
  },

  async upsert(items: DbCatalogItem[]): Promise<boolean> {
    const result = await apiCall('/api/catalog/bulk', {
      method: 'POST',
      body: JSON.stringify(items),
    });
    return result?.success || false;
  },

  async create(item: DbCatalogItem): Promise<DbCatalogItem | null> {
    return await apiCall('/api/catalog', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  async update(id: string, updates: Partial<DbCatalogItem>): Promise<DbCatalogItem | null> {
    return await apiCall('/api/catalog', {
      method: 'POST',
      body: JSON.stringify({ id, ...updates }),
    });
  },

  async delete(id: string): Promise<boolean> {
    const result = await apiCall(`/api/catalog/${id}`, {
      method: 'DELETE',
    });
    return result?.success || false;
  }
};
