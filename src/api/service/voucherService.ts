import {api} from "../client.ts";
import type {
    ApiResponse,
    AssignVoucherRequest,
    MemberVoucher,
    VoucherTemplate,
    VoucherTemplateRequest
} from "../types.ts";

const ROUTE = "/api/vouchers";

export const voucherService = {
    getTemplates: async () => {
        const res = await api.get<ApiResponse<VoucherTemplate[]>>(`${ROUTE}/templates`);
        return res.data;
    },

    createTemplate: async (data: VoucherTemplateRequest) => {
        const res = await api.post<ApiResponse<VoucherTemplate>>(`${ROUTE}/templates`, data);
        return res.data;
    },

    updateTemplate: async (id: number, data: VoucherTemplateRequest) => {
        const res = await api.put<ApiResponse<VoucherTemplate>>(`${ROUTE}/templates/${id}`, data);
        return res.data;
    },

    deactivateTemplate: async (id: number) => {
        const res = await api.patch<ApiResponse<VoucherTemplate>>(`${ROUTE}/templates/${id}/deactivate`);
        return res.data;
    },

    assignVoucher: async (data: AssignVoucherRequest) => {
        const res = await api.post<ApiResponse<MemberVoucher>>(`${ROUTE}/assign`, data);
        return res.data;
    },

    getMemberVouchers: async (customerId: number) => {
        const res = await api.get<ApiResponse<MemberVoucher[]>>(`${ROUTE}/member/${customerId}`);
        return res.data;
    },

    getAllMemberVouchers: async () => {
        const res = await api.get<ApiResponse<MemberVoucher[]>>(`${ROUTE}/member-vouchers`);
        return res.data;
    },

    cancelMemberVoucher: async (id: number) => {
        const res = await api.patch<ApiResponse<MemberVoucher>>(`${ROUTE}/member-vouchers/${id}/cancel`);
        return res.data;
    }
};
