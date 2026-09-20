import api from './client';
import type {
  User, Group, Bill, BillItem,
  SettlementResult, Payment, Reminder, DashboardData,
  ExtractedBill, AIConversation
} from '../types';

// ===== AUTH =====
export const authApi = {
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post<{ user: User; token: string }>('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ user: User; token: string }>('/api/auth/login', data),
  me: () => api.get<{ user: User }>('/api/auth/me'),
};

// ===== GROUPS =====
export const groupsApi = {
  list: () => api.get<{ groups: Group[] }>('/api/groups'),
  create: (data: { name: string; description?: string; category?: string; emoji?: string }) =>
    api.post<{ group: Group }>('/api/groups', data),
  get: (id: string) => api.get<{ group: Group; balances: import('../types').Balance[] }>(`/api/groups/${id}`),
  addMember: (groupId: string, email: string) =>
    api.post<{ member: import('../types').GroupMember }>(`/api/groups/${groupId}/members`, { email }),
  removeMember: (groupId: string, userId: string) =>
    api.delete(`/api/groups/${groupId}/members/${userId}`),
};

// ===== BILLS =====
export const billsApi = {
  scan: (file: File) => {
    const form = new FormData();
    form.append('bill', file);
    return api.post<{ bill: ExtractedBill }>('/api/bills/scan', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
  parseText: (text: string) =>
    api.post<{ bill: ExtractedBill }>('/api/bills/parse-text', { text }),
  create: (data: {
    groupId: string; title: string; description?: string; category?: string;
    subtotal: string; tax?: string; serviceCharge?: string; tip?: string;
    discount?: string; total: string; date?: string;
    items?: Array<{ name: string; quantity: number; price: string; totalPrice: string }>;
  }) => api.post<{ bill: Bill }>('/api/bills', data),
  get: (id: string) => api.get<{ bill: Bill }>(`/api/bills/${id}`),
  update: (id: string, data: Partial<Bill>) => api.put<{ bill: Bill }>(`/api/bills/${id}`, data),
  addItem: (billId: string, item: { name: string; quantity: number; price: string; totalPrice: string }) =>
    api.post<{ item: BillItem }>(`/api/bills/${billId}/items`, item),
  updateItem: (billId: string, itemId: string, data: Partial<BillItem>) =>
    api.put<{ item: BillItem }>(`/api/bills/${billId}/items/${itemId}`, data),
  deleteItem: (billId: string, itemId: string) =>
    api.delete(`/api/bills/${billId}/items/${itemId}`),
  assign: (billId: string, assignments: Array<{ itemId: string; userId: string; share?: string }>) =>
    api.post<{ bill: Bill }>(`/api/bills/${billId}/assign`, { assignments }),
};

// ===== SETTLEMENTS =====
export const settlementsApi = {
  calculate: (groupId: string) =>
    api.get<SettlementResult>(`/api/settlements/group/${groupId}`),
  confirm: (groupId: string) =>
    api.post<{ settlement: unknown; transactions: import('../types').SettlementTransaction[] }>(`/api/settlements/group/${groupId}/confirm`),
  history: () => api.get<{ settlements: unknown[] }>('/api/settlements/history'),
  completeTransaction: (txId: string) =>
    api.post(`/api/settlements/transactions/${txId}/complete`),
};

// ===== PAYMENTS =====
export const paymentsApi = {
  create: (data: { billId?: string; groupId?: string; toId: string; amount: string; note?: string; method?: string }) =>
    api.post<{ payment: Payment }>('/api/payments', data),
  list: () => api.get<{ payments: Payment[] }>('/api/payments'),
};

// ===== REMINDERS =====
export const remindersApi = {
  list: () => api.get<{ reminders: Reminder[] }>('/api/reminders'),
  create: (data: { targetId: string; message: string; context?: string }) =>
    api.post<{ reminder: Reminder }>('/api/reminders', data),
  send: (id: string) =>
    api.post<{ reminder: Reminder; message: string }>(`/api/reminders/${id}/send`),
  cancel: (id: string) => api.delete(`/api/reminders/${id}`),
};

// ===== DASHBOARD =====
export const dashboardApi = {
  get: () => api.get<DashboardData>('/api/dashboard'),
};

// ===== AI =====
export const aiApi = {
  chat: (data: { message: string; conversationId?: string; context?: { groupId?: string; billId?: string } }) =>
    api.post<{ conversationId: string; message: string; action?: import('../types').AIAction }>('/api/ai/chat', data),
  assign: (data: { message: string; billId: string; groupId: string }) =>
    api.post<{ assignments: Array<{ itemId: string; userId: string; share: string }>; parsed: unknown[] }>('/api/ai/assign', data),
  conversations: () => api.get<{ conversations: AIConversation[] }>('/api/ai/conversations'),
  getConversation: (id: string) => api.get<{ conversation: AIConversation }>(`/api/ai/conversations/${id}`),
};
