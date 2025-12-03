import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./page/login/LoginPage";
import DashboardPage from "./page/dashboard/DashboardPage.tsx";
import PrivateRoute from "./page/PrivateRoute.tsx";
import PublicRoute from "./page/PublicRoute.tsx";

export default function App() {

    return (
        <Routes>
            <Route element={<PublicRoute />}>
                <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<PrivateRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}
