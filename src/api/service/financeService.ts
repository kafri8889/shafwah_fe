import {api} from "../client.ts";
import type {
    ApiResponse,
    CashReconciliation,
    CashReconciliationRequest,
    FinanceCategory,
    FinanceCategoryRequest,
    FinanceExpense,
    FinanceExpenseRequest,
    MonthlyBudget,
    MonthlyBudgetRequest,
    RecurringExpense,
    RecurringExpenseRequest
} from "../types.ts";

const ROUTE = "/api/finance";

export const financeService = {
    getCategories: async () => {
        const res = await api.get<ApiResponse<FinanceCategory[]>>(`${ROUTE}/categories`);
        return res.data;
    },

    createCategory: async (data: FinanceCategoryRequest) => {
        const res = await api.post<ApiResponse<FinanceCategory>>(`${ROUTE}/categories`, data);
        return res.data;
    },

    updateCategory: async (id: number, data: FinanceCategoryRequest) => {
        const res = await api.put<ApiResponse<FinanceCategory>>(`${ROUTE}/categories/${id}`, data);
        return res.data;
    },

    deleteCategory: async (id: number) => {
        const res = await api.delete<ApiResponse<FinanceCategory>>(`${ROUTE}/categories/${id}`);
        return res.data;
    },

    getExpenses: async (startDate?: string, endDate?: string) => {
        const res = await api.get<ApiResponse<FinanceExpense[]>>(`${ROUTE}/expenses`, {
            params: startDate && endDate ? { startDate, endDate } : undefined
        });
        return res.data;
    },

    createExpense: async (data: FinanceExpenseRequest) => {
        const res = await api.post<ApiResponse<FinanceExpense>>(`${ROUTE}/expenses`, data);
        return res.data;
    },

    updateExpense: async (id: number, data: FinanceExpenseRequest) => {
        const res = await api.put<ApiResponse<FinanceExpense>>(`${ROUTE}/expenses/${id}`, data);
        return res.data;
    },

    deleteExpense: async (id: number) => {
        const res = await api.delete<ApiResponse<unknown>>(`${ROUTE}/expenses/${id}`);
        return res.data;
    },

    getBudgets: async (month?: string) => {
        const res = await api.get<ApiResponse<MonthlyBudget[]>>(`${ROUTE}/budgets`, {
            params: month ? { month } : undefined
        });
        return res.data;
    },

    saveBudget: async (data: MonthlyBudgetRequest) => {
        const res = await api.post<ApiResponse<MonthlyBudget>>(`${ROUTE}/budgets`, data);
        return res.data;
    },

    deleteBudget: async (id: number) => {
        const res = await api.delete<ApiResponse<unknown>>(`${ROUTE}/budgets/${id}`);
        return res.data;
    },

    getRecurringExpenses: async () => {
        const res = await api.get<ApiResponse<RecurringExpense[]>>(`${ROUTE}/recurring-expenses`);
        return res.data;
    },

    createRecurringExpense: async (data: RecurringExpenseRequest) => {
        const res = await api.post<ApiResponse<RecurringExpense>>(`${ROUTE}/recurring-expenses`, data);
        return res.data;
    },

    updateRecurringExpense: async (id: number, data: RecurringExpenseRequest) => {
        const res = await api.put<ApiResponse<RecurringExpense>>(`${ROUTE}/recurring-expenses/${id}`, data);
        return res.data;
    },

    deactivateRecurringExpense: async (id: number) => {
        const res = await api.patch<ApiResponse<RecurringExpense>>(`${ROUTE}/recurring-expenses/${id}/deactivate`);
        return res.data;
    },

    getCashReconciliations: async (startDate?: string, endDate?: string) => {
        const res = await api.get<ApiResponse<CashReconciliation[]>>(`${ROUTE}/cash-reconciliations`, {
            params: startDate && endDate ? { startDate, endDate } : undefined
        });
        return res.data;
    },

    getExpectedCash: async (date: string) => {
        const res = await api.get<ApiResponse<number>>(`${ROUTE}/cash-reconciliations/expected`, {
            params: { date }
        });
        return res.data;
    },

    createCashReconciliation: async (data: CashReconciliationRequest) => {
        const res = await api.post<ApiResponse<CashReconciliation>>(`${ROUTE}/cash-reconciliations`, data);
        return res.data;
    }
};
