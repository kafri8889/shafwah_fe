import {Navigate, Outlet} from "react-router-dom";
import {isAdminUser} from "../util/auth.ts";

export default function AdminRoute() {
    if (!isAdminUser()) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
