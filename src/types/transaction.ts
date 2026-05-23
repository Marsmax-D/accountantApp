export interface Transaction {
  id: number;
  amount: number;
  type: 'income' | 'expense';
  category_id: number;
  source: 'wechat' | 'manual';
  date: string; // YYYY-MM-DD
  note: string | null;
  order_id: string | null;
  wechat_raw: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsertTransaction {
  amount: number;
  type: 'income' | 'expense';
  category_id: number;
  source: 'wechat' | 'manual';
  date: string;
  note?: string | null;
  order_id?: string;
  wechat_raw?: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  source: 'wechat' | 'manual' | 'both';
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_system: number;
  channel: 'online' | 'offline';
  created_at: string;
}

export interface TransactionWithCategory extends Transaction {
  category_name: string;
  category_color: string | null;
  category_icon: string | null;
}
