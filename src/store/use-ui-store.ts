import { create } from 'zustand';
import { toDateString } from '@/utils/format';
import { type ReportType } from '@/types/report';

interface UIState {
  reportType: ReportType;
  selectedDate: string; // YYYY-MM-DD reference date for the selected period
  filterDateFrom: string | null;
  filterDateTo: string | null;
  filterCategoryId: number | null;
  filterSource: string | null;
  filterType: 'all' | 'income' | 'expense';
  searchQuery: string;

  setReportType: (type: ReportType) => void;
  setSelectedDate: (date: string) => void;
  setFilterDateRange: (from: string | null, to: string | null) => void;
  setFilterCategoryId: (id: number | null) => void;
  setFilterSource: (source: string | null) => void;
  setFilterType: (type: 'all' | 'income' | 'expense') => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  reportType: 'monthly',
  selectedDate: toDateString(new Date()),
  filterDateFrom: null,
  filterDateTo: null,
  filterCategoryId: null,
  filterSource: null,
  filterType: 'all',
  searchQuery: '',

  setReportType: (type) => set({ reportType: type }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setFilterDateRange: (from, to) => set({ filterDateFrom: from, filterDateTo: to }),
  setFilterCategoryId: (id) => set({ filterCategoryId: id }),
  setFilterSource: (source) => set({ filterSource: source }),
  setFilterType: (type) => set({ filterType: type }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetFilters: () => set({
    filterDateFrom: null,
    filterDateTo: null,
    filterCategoryId: null,
    filterSource: null,
    filterType: 'all',
    searchQuery: '',
  }),
}));
