import {api} from "../client.ts";
import type {ApiResponse, TreatmentCategory} from "../types.ts";

const ROUTE = "/api/treatment-category";

interface CategoryRequest {
    title: string;
    subTitle: string;
    notes: string[];
}

export const treatmentCategoryService = {
    getAll: async () => {
        const res = await api.get<ApiResponse<TreatmentCategory[]>>(ROUTE);
        return res.data;
    },

    getById: async (id: number) => {
        const res = await api.get<ApiResponse<TreatmentCategory>>(`${ROUTE}/${id}`);
        return res.data;
    },

    create: async (data: CategoryRequest) => {
        const res = await api.post<ApiResponse<TreatmentCategory>>(ROUTE, data);
        return res.data;
    },

    update: async (id: number, data: CategoryRequest) => {
        const res = await api.put<ApiResponse<TreatmentCategory>>(`${ROUTE}/${id}`, data);
        return res.data;
    },

    delete: async (id: number) => {
        const res = await api.delete<ApiResponse<unknown>>(`${ROUTE}/${id}`);
        return res.data;
    }
};
