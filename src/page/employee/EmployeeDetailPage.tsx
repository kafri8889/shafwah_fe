import {useEffect, useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {
    Avatar,
    Box,
    Button,
    Chip,
    Divider,
    Grid,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from "@mui/material";
import {
    ArrowBack as BackIcon,
    Groups as MemberIcon,
    MonetizationOn as MoneyIcon,
    Paid as CommissionIcon,
    ReceiptLong as ReceiptIcon,
    Spa as SpaIcon
} from "@mui/icons-material";
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis} from "recharts";
import toast, {Toaster} from "react-hot-toast";
import AppShell from "../../components/AppShell.tsx";
import type {CustomerTransaction, Employee} from "../../api/types.ts";
import {employeeService} from "../../api/service/employeeService.ts";
import {transactionService} from "../../api/service/transactionService.ts";
import {
    buildEmployeeItemStats,
    buildEmployeeSpendTrend,
    buildMemberStats,
    filterTransactionsByDate,
    formatCurrency,
    formatDateInput,
    formatDateTime,
    formatItemCommissionRule,
    getEmployeeCommission,
    getEmployeeItems,
    getEmployeeRevenue,
    getItemName,
    parseDate,
    transactionHandledByEmployee,
    uniqueCustomerCount
} from "./employeeInsights.ts";

const chartTooltipStyle = {
    borderRadius: 8,
    border: "1px solid rgba(143, 94, 54, 0.18)",
    boxShadow: "0 12px 28px rgba(31, 24, 18, 0.12)"
};

export default function EmployeeDetailPage() {
    const {id} = useParams();
    const navigate = useNavigate();
    const employeeId = Number(id);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [rangePreset, setRangePreset] = useState("all");
    const [startDate, setStartDate] = useState(formatDateInput(new Date()));
    const [endDate, setEndDate] = useState(formatDateInput(new Date()));

    useEffect(() => {
        if (!employeeId) return;

        Promise.all([
            employeeService.getById(employeeId),
            transactionService.getAll()
        ])
            .then(([employeeRes, transactionRes]) => {
                if (!employeeRes.success || !employeeRes.data) {
                    throw new Error(employeeRes.message || "Employee tidak ditemukan.");
                }

                setEmployee(employeeRes.data);
                setTransactions(
                    transactionRes.success && Array.isArray(transactionRes.data)
                        ? transactionRes.data
                            .filter((trx) => transactionHandledByEmployee(trx, employeeId))
                            .sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0))
                        : []
                );
            })
            .catch((error) => {
                console.error(error);
                toast.error(error instanceof Error ? error.message : "Gagal memuat detail employee.");
                setEmployee(null);
                setTransactions([]);
            })
            .finally(() => setLoading(false));
    }, [employeeId]);

    const filteredTransactions = useMemo(
        () => filterTransactionsByDate(transactions, rangePreset, startDate, endDate),
        [transactions, rangePreset, startDate, endDate]
    );
    const totalRevenue = useMemo(
        () => filteredTransactions.reduce((sum, trx) => sum + getEmployeeRevenue(trx, employeeId), 0),
        [filteredTransactions, employeeId]
    );
    const totalCommission = useMemo(
        () => filteredTransactions.reduce((sum, trx) => sum + getEmployeeCommission(trx, employeeId), 0),
        [filteredTransactions, employeeId]
    );
    const averageRevenue = filteredTransactions.length === 0 ? 0 : totalRevenue / filteredTransactions.length;
    const memberCount = uniqueCustomerCount(filteredTransactions);
    const spendTrend = useMemo(() => buildEmployeeSpendTrend(filteredTransactions, employeeId), [filteredTransactions, employeeId]);
    const treatmentStats = useMemo(() => buildEmployeeItemStats(filteredTransactions, employeeId, "Single"), [filteredTransactions, employeeId]);
    const packageStats = useMemo(() => buildEmployeeItemStats(filteredTransactions, employeeId, "Package"), [filteredTransactions, employeeId]);
    const memberStats = useMemo(() => buildMemberStats(filteredTransactions), [filteredTransactions]);

    return (
        <AppShell
            title={employee?.name || "Detail Employee"}
            subtitle="Performa employee, member yang di-handle, transaksi, treatment, paket, dan komisi."
            actions={
                <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate("/employees")}>
                    Kembali
                </Button>
            }
        >
            <Toaster />

            <Paper sx={{ p: 3, borderRadius: 1, mb: 3 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems={{ md: "center" }}>
                    <Avatar sx={{ width: 64, height: 64, borderRadius: 1, bgcolor: "primary.main", fontSize: 28 }}>
                        {employee?.name?.slice(0, 1).toUpperCase() || "E"}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h5" fontWeight={800}>
                            {employee?.name || (loading ? "Memuat employee..." : "Employee tidak ditemukan")}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {employee?.role || "-"} | {employee?.phoneNumber || "-"}
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip label={employee?.active === false ? "Nonaktif" : "Aktif"} color={employee?.active === false ? "default" : "secondary"} />
                        <Chip icon={<CommissionIcon />} label={`Komisi: ${formatCurrency(totalCommission)}`} variant="outlined" />
                    </Stack>
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, mb: 3 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} justifyContent="space-between">
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700}>Filter Performa</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Transaksi, omzet, member, grafik, dan komisi mengikuti tanggal yang dipilih.
                        </Typography>
                    </Box>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <TextField
                            select
                            size="small"
                            label="Tanggal"
                            value={rangePreset}
                            onChange={(event) => setRangePreset(event.target.value)}
                            sx={{ minWidth: 160 }}
                        >
                            <MenuItem value="all">Semua</MenuItem>
                            <MenuItem value="today">Hari ini</MenuItem>
                            <MenuItem value="7d">7 hari</MenuItem>
                            <MenuItem value="30d">30 hari</MenuItem>
                            <MenuItem value="custom">Custom</MenuItem>
                        </TextField>
                        {rangePreset === "custom" && (
                            <>
                                <TextField
                                    size="small"
                                    type="date"
                                    label="Dari"
                                    InputLabelProps={{ shrink: true }}
                                    value={startDate}
                                    onChange={(event) => setStartDate(event.target.value)}
                                />
                                <TextField
                                    size="small"
                                    type="date"
                                    label="Sampai"
                                    InputLabelProps={{ shrink: true }}
                                    value={endDate}
                                    onChange={(event) => setEndDate(event.target.value)}
                                />
                            </>
                        )}
                    </Stack>
                </Stack>
            </Paper>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Omzet Ditangani</Typography>
                        <Typography variant="h5" fontWeight={800}>{formatCurrency(totalRevenue)}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Transaksi</Typography>
                        <Typography variant="h5" fontWeight={800}>{filteredTransactions.length.toLocaleString("id-ID")}x</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Member Ditangani</Typography>
                        <Typography variant="h5" fontWeight={800}>{memberCount.toLocaleString("id-ID")}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Komisi</Typography>
                        <Typography variant="h5" fontWeight={800}>{formatCurrency(totalCommission)}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <MoneyIcon color="primary" />
                            <Box>
                                <Typography variant="h6">Tren Omzet Ditangani</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Rata-rata transaksi: {formatCurrency(averageRevenue)}
                                </Typography>
                            </Box>
                        </Stack>
                        <Box sx={{ width: "100%", height: 270 }}>
                            {spendTrend.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                    <Typography variant="body2" color="text.secondary">Belum ada transaksi pada filter ini.</Typography>
                                </Stack>
                            ) : (
                                <ResponsiveContainer>
                                    <BarChart data={spendTrend} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(143, 94, 54, 0.14)" />
                                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                                        <RechartsTooltip
                                            cursor={{ fill: "rgba(180, 123, 76, 0.08)" }}
                                            contentStyle={chartTooltipStyle}
                                            formatter={(value) => [formatCurrency(Number(value)), "Omzet"]}
                                        />
                                        <Bar dataKey="value" fill="#B47B4C" radius={[6, 6, 0, 0]} maxBarSize={54} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, lg: 5 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <MemberIcon color="primary" />
                            <Typography variant="h6">Member yang Di-handle</Typography>
                        </Stack>
                        <Box sx={{ width: "100%", height: 270 }}>
                            {memberStats.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                    <Typography variant="body2" color="text.secondary">Belum ada member pada filter ini.</Typography>
                                </Stack>
                            ) : (
                                <ResponsiveContainer>
                                    <BarChart data={memberStats} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(143, 94, 54, 0.14)" />
                                        <XAxis type="number" allowDecimals={false} hide />
                                        <YAxis dataKey="name" type="category" width={150} tickLine={false} axisLine={false} />
                                        <RechartsTooltip
                                            cursor={{ fill: "rgba(108, 138, 108, 0.08)" }}
                                            contentStyle={chartTooltipStyle}
                                            formatter={(value) => [`${Number(value).toLocaleString("id-ID")} transaksi`, "Jumlah"]}
                                        />
                                        <Bar dataKey="value" fill="#6C8A6C" radius={[0, 6, 6, 0]} maxBarSize={26} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <SpaIcon color="primary" />
                            <Typography variant="h6">Treatment Ditangani</Typography>
                        </Stack>
                        <Box sx={{ width: "100%", height: 280 }}>
                            {treatmentStats.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                    <Typography variant="body2" color="text.secondary">Belum ada treatment single.</Typography>
                                </Stack>
                            ) : (
                                <ResponsiveContainer>
                                    <BarChart data={treatmentStats} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(143, 94, 54, 0.14)" />
                                        <XAxis type="number" allowDecimals={false} hide />
                                        <YAxis dataKey="name" type="category" width={180} tickLine={false} axisLine={false} />
                                        <RechartsTooltip
                                            cursor={{ fill: "rgba(108, 138, 108, 0.08)" }}
                                            contentStyle={chartTooltipStyle}
                                            formatter={(value) => [`${Number(value).toLocaleString("id-ID")} kali`, "Ditangani"]}
                                        />
                                        <Bar dataKey="value" fill="#6C8A6C" radius={[0, 6, 6, 0]} maxBarSize={28} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Paket Ditangani</Typography>
                        <Box sx={{ width: "100%", height: 280 }}>
                            {packageStats.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                    <Typography variant="body2" color="text.secondary">Belum ada paket.</Typography>
                                </Stack>
                            ) : (
                                <ResponsiveContainer>
                                    <BarChart data={packageStats} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(143, 94, 54, 0.14)" />
                                        <XAxis type="number" allowDecimals={false} hide />
                                        <YAxis dataKey="name" type="category" width={180} tickLine={false} axisLine={false} />
                                        <RechartsTooltip
                                            cursor={{ fill: "rgba(196, 112, 93, 0.08)" }}
                                            contentStyle={chartTooltipStyle}
                                            formatter={(value) => [`${Number(value).toLocaleString("id-ID")} kali`, "Ditangani"]}
                                        />
                                        <Bar dataKey="value" fill="#C4705D" radius={[0, 6, 6, 0]} maxBarSize={28} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Paper sx={{ p: 3, borderRadius: 1 }}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="h6">Riwayat Transaksi</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Breakdown item yang ditangani employee ini, dari layanan sampai basis komisi.
                        </Typography>
                    </Box>
                    <Chip icon={<ReceiptIcon />} label={`${filteredTransactions.length} transaksi`} variant="outlined" />
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Waktu</TableCell>
                                <TableCell>Member</TableCell>
                                <TableCell>Layanan</TableCell>
                                <TableCell>Breakdown</TableCell>
                                <TableCell>Pembayaran</TableCell>
                                <TableCell align="right">Total</TableCell>
                                <TableCell>Komisi</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTransactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        {loading ? "Memuat transaksi..." : "Belum ada transaksi."}
                                    </TableCell>
                                </TableRow>
                            ) : filteredTransactions.map((trx) => {
                                const employeeItems = getEmployeeItems(trx, employeeId);
                                const basis = getEmployeeRevenue(trx, employeeId);

                                return (
                                    <TableRow key={trx.id} hover>
                                        <TableCell>{formatDateTime(trx.date)}</TableCell>
                                        <TableCell>{trx.customer?.name || "-"}</TableCell>
                                        <TableCell>{employeeItems.map(getItemName).join(", ") || "-"}</TableCell>
                                        <TableCell>
                                            <Stack spacing={0.25}>
                                                {employeeItems.map((item) => (
                                                    <Typography key={`${item.treatmentType}-${item.id}`} variant="caption" color="text.secondary">
                                                        {getItemName(item)}: {formatCurrency(item.price || 0)} | {formatItemCommissionRule(item)}
                                                    </Typography>
                                                ))}
                                                <Typography variant="caption" fontWeight={800}>
                                                    Basis komisi: {formatCurrency(basis)}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{trx.paymentMethod}</TableCell>
                                        <TableCell align="right">{formatCurrency(basis)}</TableCell>
                                        <TableCell>{formatCurrency(getEmployeeCommission(trx, employeeId))}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </AppShell>
    );
}
