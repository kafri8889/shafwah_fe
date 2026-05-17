import {api} from "../client";
import type {ApiResponse, CustomerTransaction, LegacyTransactionRequest, TransactionRequest} from "../types";

const ROUTE = "/api/transaction";

export const transactionService = {
    getAll: async () => {
        const res = await api.get<ApiResponse<CustomerTransaction[]>>(ROUTE);
        return res.data;
    },

    create: async (data: TransactionRequest) => {
        const res = await api.post<ApiResponse<CustomerTransaction>>(ROUTE, data);
        return res.data;
    },

    createLegacy: async (data: LegacyTransactionRequest) => {
        const res = await api.post<ApiResponse<CustomerTransaction>>(`${ROUTE}/legacy`, data);
        return res.data;
    },

    update: async (id: number, data: TransactionRequest) => {
        const res = await api.put<ApiResponse<CustomerTransaction>>(`${ROUTE}/${id}`, data);
        return res.data;
    },

    delete: async (id: number) => {
        const res = await api.delete<ApiResponse<unknown>>(`${ROUTE}/${id}`);
        return res.data;
    }
};

