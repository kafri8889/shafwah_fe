import {api} from "../client.ts";
import type {ApiResponse, Customer, PagedResponse} from "../types.ts";

const ROUTE = "/api/customers";

interface CustomerPayload {
    name: string;
    phoneNumber: string;
    address: string;
    birthDate?: string | null;
    visitCount?: number;
    totalVisitCount?: number;
    lastVisitDate?: string;
}

export interface CustomerPagedParams {
    page?: number;
    size?: number;
    sort?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
}

export const customerService = {
    getAll: async () => {
        const res = await api.get<ApiResponse<Customer[]>>(ROUTE);
        return res.data;
    },

    getPaged: async (params: CustomerPagedParams = {}) => {
        const res = await api.get<ApiResponse<PagedResponse<Customer>>>(`${ROUTE}/paged`, {
            params: {
                page: params.page ?? 0,
                size: params.size ?? 20,
                sort: params.sort ?? "lastVisitDate,desc",
                search: params.search?.trim() || undefined,
                startDate: params.startDate || undefined,
                endDate: params.endDate || undefined
            }
        });
        return res.data;
    },

    getById: async (id: number) => {
        const res = await api.get<ApiResponse<Customer>>(`${ROUTE}/${id}`);
        return res.data;
    },

    create: async (data: CustomerPayload) => {
        const res = await api.post<ApiResponse<Customer>>(ROUTE, data);
        return res.data;
    },

    update: async (id: number, data: CustomerPayload) => {
        const res = await api.put<ApiResponse<Customer>>(`${ROUTE}/${id}`, data);
        return res.data;
    },

    delete: async (id: number) => {
        const res = await api.delete<ApiResponse<unknown>>(`${ROUTE}/${id}`);
        return res.data;
    }
};
