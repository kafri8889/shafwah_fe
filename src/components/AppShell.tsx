import {Avatar, Box, Button, Paper, Stack, Typography} from "@mui/material";
import {Link as RouterLink, useLocation, useNavigate} from "react-router-dom";
import type {ReactNode} from "react";
import {isAdminUser} from "../util/auth.ts";

type AppShellProps = {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    children: ReactNode;
};

const navItems = [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Member", to: "/members" },
    { label: "Employee", to: "/employees" },
    { label: "Treatment", to: "/treatments" },
    { label: "Voucher", to: "/vouchers" },
    { label: "Finance", to: "/finance" },
    { label: "Insights", to: "/insights" }
];

export default function AppShell({ title, subtitle, actions, children }: AppShellProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const visibleNavItems = navItems.filter((item) =>
        (item.to !== "/insights" && item.to !== "/vouchers" && item.to !== "/employees" && item.to !== "/treatments" && item.to !== "/finance") || isAdminUser()
    );

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        navigate("/login", { replace: true });
    };

    return (
        <Box className="page-shell" sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
            <Box sx={{ width: "100%" }} className="fade-in">
                <Paper
                    elevation={0}
                    sx={{
                        px: { xs: 2, md: 3 },
                        py: 2,
                        mb: 3,
                        borderRadius: 1,
                        border: "1px solid rgba(233, 221, 208, 0.7)",
                        background: "rgba(255, 248, 240, 0.9)",
                        backdropFilter: "blur(12px)"
                    }}
                >
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                        <Stack direction="row" spacing={2} alignItems="center" flex={1}>
                                <Avatar
                                    sx={{
                                        bgcolor: "primary.main",
                                        color: "primary.contrastText",
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1
                                    }}
                                >
                                S
                            </Avatar>
                            <Box>
                                <Typography variant="h6" sx={{ lineHeight: 1 }}>
                                    Salon Muslimah Shafwah
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Salon & Wellness Dashboard
                                </Typography>
                            </Box>
                        </Stack>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                        {visibleNavItems.map((item) => {
                            const active = location.pathname.startsWith(item.to);
                            return (
                                <Button
                                    key={item.to}
                                    component={RouterLink}
                                    to={item.to}
                                    variant={active ? "contained" : "text"}
                                    color={active ? "primary" : "inherit"}
                                    sx={{
                                            borderRadius: 8,
                                            px: 2.4,
                                            color: active ? "primary.contrastText" : "text.primary",
                                            bgcolor: active ? "primary.main" : "transparent",
                                            fontWeight: 600
                                    }}
                                >
                                        {item.label}
                                    </Button>
                                );
                            })}
                            <Button
                                variant="outlined"
                                color="inherit"
                                onClick={handleLogout}
                                sx={{
                                    borderRadius: 8,
                                    px: 2.4,
                                    color: "text.primary",
                                    borderColor: "rgba(60, 47, 42, 0.22)",
                                    fontWeight: 600
                                }}
                            >
                                Logout
                            </Button>
                        </Stack>
                    </Stack>
                </Paper>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }} alignItems={{ md: "center" }}>
                    <Box flex={1}>
                        <Typography variant="h4" sx={{ mb: 0.5 }}>
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography variant="body1" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    {actions && <Box>{actions}</Box>}
                </Stack>

                {children}
            </Box>
        </Box>
    );
}
