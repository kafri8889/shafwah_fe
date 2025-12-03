import { api } from "../client.ts";
import type { ApiResponse, LoginRequest } from "../types.ts";

export async function login(request: LoginRequest) {
    const res = await api.post<ApiResponse<string>>(
        "/api/auth/login",
        request
    );

    return res.data;
}
