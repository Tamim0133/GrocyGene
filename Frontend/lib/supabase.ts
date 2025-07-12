import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mevrwuulidnmkyowfmgj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldnJ3dXVsaWRubWt5b3dmbWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0ODYyMDksImV4cCI6MjA2NjA2MjIwOX0.zuibr5GXK8TobSkoazXpO27KWaYN-VnHYlWAkJPL9IY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  name: string;
  phone?: string;
  region?: string;
  family_members: number;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  weight?: number;
  height?: number;
  bmi?: number;
  bmr?: number;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  purchase_date: string;
  expiry_date?: string;
  predicted_finish_date?: string;
  consumption_rate?: number;
  price?: number;
  brand?: string;
  status: 'good' | 'low' | 'expired' | 'finished';
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'low_stock' | 'expiry' | 'reorder' | 'general';
  is_read: boolean;
  created_at: string;
}