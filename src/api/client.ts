import axios from "axios";

export const api = axios.create({
    baseURL: "http://localhost:9999",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("authToken");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});
