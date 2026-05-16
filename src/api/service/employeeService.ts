import {api} from "../client.ts";
import type {ApiResponse, Employee} from "../types.ts";

const ROUTE = "/api/employees";

interface EmployeeUpdatePayload {
    name: string;
    username: string;
    role: string;
    accessRole: string;
    phoneNumber: string;
}

export const employeeService = {
    getAll: async () => {
        const res = await api.get<ApiResponse<Employee[]>>(ROUTE);
        return res.data;
    },

    getById: async (id: number) => {
        const res = await api.get<ApiResponse<Employee>>(`${ROUTE}/${id}`);
        return res.data;
    },

    update: async (id: number, data: EmployeeUpdatePayload) => {
        const res = await api.put<ApiResponse<Employee>>(`${ROUTE}/${id}`, data);
        return res.data;
    },

    delete: async (id: number) => {
        const res = await api.delete<ApiResponse<unknown>>(`${ROUTE}/${id}`);
        return res.data;
    }
};
