import {api} from "../client.ts";
import type {ApiResponse, Treatment, TreatmentRequest} from "../types.ts";

const ROUTE = "/api/treatments";

export const treatmentService = {
    getAll: async () => {
        const res = await api.get<ApiResponse<Treatment[]>>(ROUTE);
        return res.data;
    },

    getActive: async () => {
        const res = await api.get<ApiResponse<Treatment[]>>(`${ROUTE}/active`);
        return res.data;
    },

    getInactive: async () => {
        const res = await api.get<ApiResponse<Treatment[]>>(`${ROUTE}/inactive`);
        return res.data;
    },

    getById: async (id: number) => {
        const res = await api.get<ApiResponse<Treatment>>(`${ROUTE}/${id}`);
        return res.data;
    },

    create: async (data: TreatmentRequest) => {
        const res = await api.post<ApiResponse<Treatment>>(ROUTE, data);
        return res.data;
    },

    createBatch: async (data: { treatments: TreatmentRequest[] }) => {
        const res = await api.post<ApiResponse<Treatment[]>>(`${ROUTE}/batch`, data);
        return res.data;
    },

    update: async (id: number, data: TreatmentRequest) => {
        const res = await api.put<ApiResponse<Treatment>>(`${ROUTE}/${id}`, data);
        return res.data;
    },

    delete: async (id: number) => {
        const res = await api.delete<ApiResponse<unknown>>(`${ROUTE}/${id}`);
        return res.data;
    }
};
