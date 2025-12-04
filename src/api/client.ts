import axios from "axios";

export const api = axios.create({
    baseURL: "http://localhost:9999",
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("authToken");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const msg: string = error.response?.data?.message ?? "";

        if (status === 401 && (msg === "TOKEN_EXPIRED" || msg === "TOKEN_INVALID")) {
            localStorage.removeItem("authToken");
            window.location.href = "/login";
        }

        return Promise.reject(error);
    }
);

