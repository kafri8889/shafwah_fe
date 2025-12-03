import { Navigate, Outlet } from "react-router-dom";

// buat validasi apakah user is logged in or nah, kalo nah, lempar ke login
export default function PrivateRoute() {
    const token = localStorage.getItem("authToken");

    // Kalo belom login or tokennya gag valdi
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}