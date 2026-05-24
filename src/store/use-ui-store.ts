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
  searchQuery: string;

  setReportType: (type: ReportType) => void;
  setSelectedDate: (date: string) => void;
  setFilterDateRange: (from: string | null, to: string | null) => void;
  setFilterCategoryId: (id: number | null) => void;
  setFilterSource: (source: string | null) => void;
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
  searchQuery: '',

  setReportType: (type) => set({ reportType: type }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setFilterDateRange: (from, to) => set({ filterDateFrom: from, filterDateTo: to }),
  setFilterCategoryId: (id) => set({ filterCategoryId: id }),
  setFilterSource: (source) => set({ filterSource: source }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetFilters: () => set({
    filterDateFrom: null,
    filterDateTo: null,
    filterCategoryId: null,
    filterSource: null,
    searchQuery: '',
  }),
}));
