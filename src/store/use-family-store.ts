import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import { generateUUID } from '@/utils/uuid';

interface FamilyMember {
  user_id: string;
  nickname: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

interface FamilyState {
  userId: string;
  nickname: string;
  familyId: string | null;
  familyName: string | null;
  inviteCode: string | null;
  role: 'owner' | 'admin' | 'member' | null;
  members: FamilyMember[];
  lastSyncAt: string | null;
  pendingCount: number;
  /** 每次同步完成后递增，供 UI 组件监听以刷新数据 */
  syncVersion: number;

  setUser: (userId: string, nickname: string) => void;
  setFamily: (familyId: string, familyName: string, inviteCode: string, role: 'owner' | 'admin' | 'member') => void;
  setMembers: (members: FamilyMember[]) => void;
  leaveFamily: () => void;
  setLastSync: (time: string) => void;
  setPendingCount: (count: number) => void;
  incrementSyncVersion: () => void;
}

export const useFamilyStore = create<FamilyState>((set) => ({
  userId: '',
  nickname: '',
  familyId: null,
  familyName: null,
  inviteCode: null,
  role: null,
  members: [],
  lastSyncAt: null,
  pendingCount: 0,
  syncVersion: 0,

  setUser: (userId, nickname) => set({ userId, nickname }),
  setFamily: (familyId, familyName, inviteCode, role) =>
    set({ familyId, familyName, inviteCode, role }),
  setMembers: (members) => set({ members }),
  leaveFamily: () =>
    set({ familyId: null, familyName: null, inviteCode: null, role: null, members: [], lastSyncAt: null }),
  setLastSync: (lastSyncAt) => set({ lastSyncAt }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  incrementSyncVersion: () => set((s) => ({ syncVersion: s.syncVersion + 1 })),
}));
