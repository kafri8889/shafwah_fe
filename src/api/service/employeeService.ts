import {api} from "../client.ts";
import type {ApiResponse, Employee} from "../types.ts";

interface EmployeeUpdatePayload {
    name: string;
    role: string;
    phoneNumber: string;
    active?: boolean;
}

export const employeeService = {
    getAll: async () => {
        const res = await api.get<ApiResponse<Employee[]>>("/api/staff");
        return res.data;
    },

    getActive: async () => {
        const res = await api.get<ApiResponse<Employee[]>>("/api/staff/active");
        return res.data;
    },

    getById: async (id: number) => {
        const res = await api.get<ApiResponse<Employee>>(`/api/staff/${id}`);
        return res.data;
    },

    create: async (data: EmployeeUpdatePayload) => {
        const res = await api.post<ApiResponse<Employee>>("/api/staff", data);
        return res.data;
    },

    update: async (id: number, data: EmployeeUpdatePayload) => {
        const res = await api.put<ApiResponse<Employee>>(`/api/staff/${id}`, data);
        return res.data;
    },

    delete: async (id: number) => {
        const res = await api.delete<ApiResponse<unknown>>(`/api/staff/${id}`);
        return res.data;
    }
};
