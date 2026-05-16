import {Navigate, Route, Routes} from "react-router-dom";
import LoginPage from "./page/login/LoginPage";
import DashboardPage from "./page/dashboard/DashboardPage.tsx";
import InsightsPage from "./page/insights/InsightsPage.tsx";
import MemberPage from "./page/member/MemberPage.tsx";
import PrivateRoute from "./page/PrivateRoute.tsx";
import PublicRoute from "./page/PublicRoute.tsx";
import AdminRoute from "./page/AdminRoute.tsx";

export default function App() {

    return (
        <Routes>
            <Route element={<PublicRoute />}>
                <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<PrivateRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/members" element={<MemberPage />} />
                <Route element={<AdminRoute />}>
                    <Route path="/insights" element={<InsightsPage />} />
                </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}
