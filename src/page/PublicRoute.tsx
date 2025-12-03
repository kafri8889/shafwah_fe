import { Navigate, Outlet } from "react-router-dom";

// buat validasi apakah user is logged in or nah,
// kalo logged in dan dy ngakess login, langsung lempar ke dashboard
export default function PublicRoute() {
    const token = localStorage.getItem("authToken");

    // Kalo belom login or tokennya gag valdi
    if (token) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}