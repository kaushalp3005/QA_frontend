'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ComplaintFormData, AIExtractionResult } from '@/types';

interface ComplaintDraftState {
  // Current draft data
  draft: ComplaintFormData | null;
  
  // AI extraction results
  lastAIResult: AIExtractionResult | null;
  
  // Fields that were applied from AI
  aiAppliedFields: Record<string, number>; // fieldPath -> confidence
  
  // Actions
  setDraft: (draft: ComplaintFormData | null) => void;
  updateDraft: (updates: Partial<ComplaintFormData>) => void;
  setAIResult: (result: AIExtractionResult | null) => void;
  applyAIField: (fieldPath: string, confidence: number) => void;
  removeAIField: (fieldPath: string) => void;
  clearDraft: () => void;
  
  // Computed getters
  hasUnsavedChanges: () => boolean;
  getFieldConfidence: (fieldPath: string) => number | null;
}

export const useComplaintDraft = create<ComplaintDraftState>()(
  persist(
    (set, get) => ({
      draft: null,
      lastAIResult: null,
      aiAppliedFields: {},
      
      setDraft: (draft) => set({ draft }),
      
      updateDraft: (updates) => set((state) => ({
        draft: state.draft ? { ...state.draft, ...updates } : null,
      })),
      
      setAIResult: (result) => set({ lastAIResult: result }),
      
      applyAIField: (fieldPath, confidence) => set((state) => ({
        aiAppliedFields: {
          ...state.aiAppliedFields,
          [fieldPath]: confidence,
        },
      })),
      
      removeAIField: (fieldPath) => set((state) => {
        const { [fieldPath]: removed, ...rest } = state.aiAppliedFields;
        return { aiAppliedFields: rest };
      }),
      
      clearDraft: () => set({
        draft: null,
        lastAIResult: null,
        aiAppliedFields: {},
      }),
      
      hasUnsavedChanges: () => {
        const { draft } = get();
        return draft !== null;
      },
      
      getFieldConfidence: (fieldPath) => {
        const { aiAppliedFields } = get();
        return aiAppliedFields[fieldPath] || null;
      },
    }),
    {
      name: 'complaint-draft-storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        // Fallback for SSR
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      // Only persist draft and aiAppliedFields, not lastAIResult (too large)
      partialize: (state) => ({
        draft: state.draft,
        aiAppliedFields: state.aiAppliedFields,
      }),
    }
  )
);

// Hook for managing complaint list filters and pagination
interface ComplaintListState {
  // Filters
  statusFilter: string | null;
  sourceFilter: string | null;
  searchQuery: string;
  
  // Pagination
  currentCursor: string | null;
  hasMore: boolean;
  
  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  
  // Actions
  setStatusFilter: (status: string | null) => void;
  setSourceFilter: (source: string | null) => void;
  setSearchQuery: (query: string) => void;
  setCursor: (cursor: string | null) => void;
  setHasMore: (hasMore: boolean) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  resetFilters: () => void;
}

export const useComplaintList = create<ComplaintListState>((set) => ({
  statusFilter: null,
  sourceFilter: null,
  searchQuery: '',
  currentCursor: null,
  hasMore: true,
  isLoading: false,
  isLoadingMore: false,
  
  setStatusFilter: (status) => set({ statusFilter: status, currentCursor: null }),
  setSourceFilter: (source) => set({ sourceFilter: source, currentCursor: null }),
  setSearchQuery: (query) => set({ searchQuery: query, currentCursor: null }),
  setCursor: (cursor) => set({ currentCursor: cursor }),
  setHasMore: (hasMore) => set({ hasMore }),
  setLoading: (loading) => set({ isLoading: loading }),
  setLoadingMore: (loading) => set({ isLoadingMore: loading }),
  
  resetFilters: () => set({
    statusFilter: null,
    sourceFilter: null,
    searchQuery: '',
    currentCursor: null,
    hasMore: true,
  }),
}));

// Hook for managing toast notifications
interface ToastState {
  toasts: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    autoHide?: boolean;
  }>;
  
  addToast: (toast: Omit<ToastState['toasts'][0], 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2);
    const newToast = { ...toast, id };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));
    
    // Auto-hide after 5 seconds if not disabled
    if (toast.autoHide !== false) {
      setTimeout(() => {
        get().removeToast(id);
      }, 5000);
    }
  },
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((toast) => toast.id !== id),
  })),
  
  clearToasts: () => set({ toasts: [] }),
}));