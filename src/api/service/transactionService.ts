import {api} from "../client.ts";
import type {ApiResponse, CustomerTreatmentRecord} from "../types.ts";

export interface TransactionRequest {
    employeeId: number;
    treatmentId: number | null;
    treatmentPackageId: number | null;
    customer: {
        id?: number;
        name: string;
        phoneNumber?: string;
    };
    actualPrice: number;
    paymentMethod: string;
    notes: string;
    date: string;
}

const ROUTE = "/api/treatment-records";

export const transactionService = {
    getAll: async () => {
        const res = await api.get<ApiResponse<CustomerTreatmentRecord[]>>(ROUTE);
        return res.data;
    },

    create: async (data: TransactionRequest) => {
        const res = await api.post<ApiResponse<CustomerTreatmentRecord>>(ROUTE, data);
        return res.data;
    },

    update: async (id: number, data: TransactionRequest) => {
        const res = await api.put<ApiResponse<CustomerTreatmentRecord>>(`${ROUTE}/${id}`, data);
        return res.data;
    },

    delete: async (id: number) => {
        const res = await api.delete<ApiResponse<any>>(`${ROUTE}/${id}`);
        return res.data;
    }
};
