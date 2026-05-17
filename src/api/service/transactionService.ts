import {api} from "../client";
import type {
    ApiResponse,
    CustomerTransaction,
    LegacyTransactionRequest,
    PagedResponse,
    PaymentMethod,
    TransactionRequest
} from "../types";

const ROUTE = "/api/transaction";

export interface TransactionPagedParams {
    page?: number;
    size?: number;
    sort?: string;
    startDate?: string;
    endDate?: string;
    customerId?: number;
    employeeId?: number;
    paymentMethod?: PaymentMethod;
}

export const transactionService = {
    getAll: async () => {
        const res = await api.get<ApiResponse<CustomerTransaction[]>>(ROUTE);
        return res.data;
    },

    getPaged: async (params: TransactionPagedParams = {}) => {
        const res = await api.get<ApiResponse<PagedResponse<CustomerTransaction>>>(`${ROUTE}/paged`, {
            params: {
                page: params.page ?? 0,
                size: params.size ?? 20,
                sort: params.sort ?? "date,desc",
                startDate: params.startDate || undefined,
                endDate: params.endDate || undefined,
                customerId: params.customerId ?? undefined,
                employeeId: params.employeeId ?? undefined,
                paymentMethod: params.paymentMethod || undefined
            }
        });
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
