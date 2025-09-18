import { create } from "zustand";
import type { Bill, CreateBillRequest, JoinBillRequest } from "../types/app";
import { billApi } from "../services/api";

interface BillState {
  bills: Bill[];
  currentBill: Bill | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setBills: (bills: Bill[]) => void;
  setCurrentBill: (bill: Bill | null) => void;
  addBill: (bill: Bill) => void;
  updateBill: (billId: string, updates: Partial<Bill>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async actions (will be implemented with API calls)
  createBill: (request: CreateBillRequest) => Promise<void>;
  joinBill: (request: JoinBillRequest) => Promise<void>;
  fetchBills: () => Promise<void>;
  fetchBill: (billId: string) => Promise<void>;
}

export const useBillStore = create<BillState>(set => ({
  bills: [],
  currentBill: null,
  isLoading: false,
  error: null,

  setBills: bills => set({ bills }),
  setCurrentBill: currentBill => set({ currentBill }),
  addBill: bill =>
    set(state => ({
      bills: [bill, ...state.bills],
    })),
  updateBill: (billId, updates) =>
    set(state => ({
      bills: state.bills.map(bill =>
        bill.id === billId ? { ...bill, ...updates } : bill
      ),
      currentBill:
        state.currentBill?.id === billId
          ? { ...state.currentBill, ...updates }
          : state.currentBill,
    })),
  setLoading: isLoading => set({ isLoading }),
  setError: error => set({ error }),

  // Placeholder implementations - will be replaced with actual API calls
  createBill: async (request: CreateBillRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await billApi.createBill(request);
      const newBill = response.data;

      set(state => ({
        isLoading: false,
        bills: [newBill, ...state.bills],
        currentBill: newBill,
      }));

      return newBill;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to create bill",
      });
      throw error;
    }
  },

  joinBill: async (request: JoinBillRequest) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implement API call
      console.log("Joining bill:", request);
      set({ isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to join bill",
      });
    }
  },

  fetchBills: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await billApi.getBills();
      const bills = response.data.bills;

      set({
        isLoading: false,
        bills: bills,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch bills",
      });
    }
  },

  fetchBill: async (billId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await billApi.getBill(billId);
      const bill = response.data;

      set({
        isLoading: false,
        currentBill: bill,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch bill",
      });
    }
  },
}));
