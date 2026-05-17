import {Navigate, Route, Routes} from "react-router-dom";
import LoginPage from "./page/login/LoginPage";
import DashboardPage from "./page/dashboard/DashboardPage.tsx";
import InsightsPage from "./page/insights/InsightsPage.tsx";
import MemberPage from "./page/member/MemberPage.tsx";
import MemberDetailPage from "./page/member/MemberDetailPage.tsx";
import EmployeePage from "./page/employee/EmployeePage.tsx";
import EmployeeDetailPage from "./page/employee/EmployeeDetailPage.tsx";
import VoucherPage from "./page/voucher/VoucherPage.tsx";
import TreatmentManagementPage from "./page/treatment/TreatmentManagementPage.tsx";
import FinancePage from "./page/finance/FinancePage.tsx";
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
                <Route path="/members/:id" element={<MemberDetailPage />} />
                <Route element={<AdminRoute />}>
                    <Route path="/employees" element={<EmployeePage />} />
                    <Route path="/employees/:id" element={<EmployeeDetailPage />} />
                    <Route path="/treatments" element={<TreatmentManagementPage />} />
                    <Route path="/finance" element={<FinancePage />} />
                    <Route path="/insights" element={<InsightsPage />} />
                    <Route path="/vouchers" element={<VoucherPage />} />
                </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}
