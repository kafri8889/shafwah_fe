import {api} from "../client.ts";
import type {ApiResponse, Customer} from "../types.ts";

const ROUTE = "/api/customers";

interface CustomerPayload {
    name: string;
    phoneNumber: string;
    address: string;
    visitCount?: number;
    totalVisitCount?: number;
    lastVisitDate?: string;
}

export const customerService = {
    getAll: async () => {
        const res = await api.get<ApiResponse<Customer[]>>(ROUTE);
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
        const res = await api.delete<ApiResponse<any>>(`${ROUTE}/${id}`);
        return res.data;
    },

    searchByName: async (name: string) => {
        const res = await api.get<ApiResponse<Customer[]>>(`${ROUTE}/search/by-name`, {
            params: { name }
        });
        return res.data;
    },

    searchByVisitCount: async (min: number, max: number) => {
        const res = await api.get<ApiResponse<Customer[]>>(`${ROUTE}/search/by-visit-count`, {
            params: { min, max }
        });
        return res.data;
    },

    searchByTotalVisitCount: async (min: number, max: number) => {
        const res = await api.get<ApiResponse<Customer[]>>(`${ROUTE}/search/by-total-visit-count`, {
            params: { min, max }
        });
        return res.data;
    },

    searchByLastVisitDate: async (start: string, end: string) => {
        const res = await api.get<ApiResponse<Customer[]>>(`${ROUTE}/search/by-last-visit-date`, {
            params: { start, end }
        });
        return res.data;
    }
};