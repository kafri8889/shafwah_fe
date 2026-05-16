import {api} from "../client.ts";
import type {ApiResponse, TreatmentPackage, TreatmentPackageRequest} from "../types.ts";

const ROUTE = "/api/treatment-packages";

export const treatmentPackageService = {
    getAll: async () => {
        const res = await api.get<ApiResponse<TreatmentPackage[]>>(ROUTE);
        return res.data;
    },

    getById: async (id: number) => {
        const res = await api.get<ApiResponse<TreatmentPackage>>(`${ROUTE}/${id}`);
        return res.data;
    },

    create: async (data: TreatmentPackageRequest) => {
        const res = await api.post<ApiResponse<TreatmentPackage>>(ROUTE, data);
        return res.data;
    },

    createBatch: async (data: { packages: TreatmentPackageRequest[] }) => {
        const res = await api.post<ApiResponse<TreatmentPackage[]>>(`${ROUTE}/batch`, data);
        return res.data;
    },

    update: async (id: number, data: TreatmentPackageRequest) => {
        const res = await api.put<ApiResponse<TreatmentPackage>>(`${ROUTE}/${id}`, data);
        return res.data;
    },

    delete: async (id: number) => {
        const res = await api.delete<ApiResponse<unknown>>(`${ROUTE}/${id}`);
        return res.data;
    }
};
