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
    CardGiftcard as VoucherIcon,
    MonetizationOn as MoneyIcon,
    ReceiptLong as ReceiptIcon,
    Spa as SpaIcon,
    Today as TodayIcon
} from "@mui/icons-material";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis
} from "recharts";
import toast, {Toaster} from "react-hot-toast";
import AppShell from "../../components/AppShell.tsx";
import type {Customer, CustomerTransaction, CustomerTransactionItem, MemberVoucher} from "../../api/types.ts";
import {customerService} from "../../api/service/customerService.ts";
import {transactionService} from "../../api/service/transactionService.ts";
import {voucherService} from "../../api/service/voucherService.ts";

type ChartPoint = {
    name: string;
    value: number;
};

const chartColors = ["#B47B4C", "#C4705D", "#6C8A6C", "#D1A45E", "#8F5E36"];

const chartTooltipStyle = {
    borderRadius: 8,
    border: "1px solid rgba(143, 94, 54, 0.18)",
    boxShadow: "0 12px 28px rgba(31, 24, 18, 0.12)"
};

function formatCurrency(value: number) {
    return `Rp ${value.toLocaleString("id-ID")}`;
}

function parseDate(value: string) {
    if (!value) return null;
    const parsed = new Date(value.includes("T") ? value : value.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value: string) {
    const parsed = parseDate(value);
    if (!parsed) return "-";

    return parsed.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDateInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getItemName(item: CustomerTransactionItem) {
    if (item.treatmentType === "Package" && item.treatmentPackage) {
        return item.treatmentPackage.title;
    }

    return item.treatment?.title || "Layanan tidak diketahui";
}

function buildItemStats(transactions: CustomerTransaction[], type?: "Single" | "Package"): ChartPoint[] {
    const counts = new Map<string, number>();

    transactions.forEach((trx) => {
        trx.items?.forEach((item) => {
            if (type && item.treatmentType !== type) return;
            const name = getItemName(item);
            counts.set(name, (counts.get(name) || 0) + 1);
        });
    });

    return Array.from(counts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
}

function buildPaymentStats(transactions: CustomerTransaction[]): ChartPoint[] {
    const counts = new Map<string, number>();

    transactions.forEach((trx) => {
        counts.set(trx.paymentMethod, (counts.get(trx.paymentMethod) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

function buildSpendTrend(transactions: CustomerTransaction[]): ChartPoint[] {
    if (transactions.length === 0) return [];

    const sortedDates = transactions
        .map((trx) => parseDate(trx.date))
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => a.getTime() - b.getTime());

    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    const dayRange = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / 86_400_000));
    const useDailyBuckets = dayRange <= 45;
    const buckets = new Map<string, ChartPoint>();

    transactions.forEach((trx) => {
        const parsed = parseDate(trx.date);
        if (!parsed) return;

        const key = useDailyBuckets
            ? formatDateInput(parsed)
            : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
        const name = useDailyBuckets
            ? parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
            : parsed.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });

        buckets.set(key, {
            name,
            value: (buckets.get(key)?.value || 0) + (trx.actualPrice || 0)
        });
    });

    return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, point]) => point);
}

function filterTransactionsByDate(
    transactions: CustomerTransaction[],
    rangePreset: string,
    startDate: string,
    endDate: string
) {
    const now = new Date();
    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;

    if (rangePreset === "today") {
        rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (rangePreset === "7d") {
        rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    } else if (rangePreset === "30d") {
        rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    } else if (rangePreset === "custom" && startDate && endDate) {
        rangeStart = new Date(startDate + "T00:00:00");
        rangeEnd = new Date(endDate + "T23:59:59.999");
    }

    if (!rangeStart && !rangeEnd) return transactions;

    return transactions.filter((trx) => {
        const parsed = parseDate(trx.date);
        if (!parsed) return false;
        if (rangeStart && parsed < rangeStart) return false;
        if (rangeEnd && parsed > rangeEnd) return false;
        return true;
    });
}

export default function MemberDetailPage() {
    const {id} = useParams();
    const navigate = useNavigate();
    const memberId = Number(id);
    const [member, setMember] = useState<Customer | null>(null);
    const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
    const [vouchers, setVouchers] = useState<MemberVoucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [rangePreset, setRangePreset] = useState("all");
    const [startDate, setStartDate] = useState(formatDateInput(new Date()));
    const [endDate, setEndDate] = useState(formatDateInput(new Date()));

    useEffect(() => {
        if (!memberId) return;

        Promise.all([
            customerService.getById(memberId),
            transactionService.getAll(),
            voucherService.getMemberVouchers(memberId)
        ])
            .then(([memberRes, transactionRes, voucherRes]) => {
                if (!memberRes.success || !memberRes.data) {
                    throw new Error(memberRes.message || "Member tidak ditemukan.");
                }

                setMember(memberRes.data);
                setTransactions(
                    transactionRes.success && Array.isArray(transactionRes.data)
                        ? transactionRes.data
                            .filter((trx) => trx.customer?.id === memberId)
                            .sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0))
                        : []
                );
                setVouchers(voucherRes.success && Array.isArray(voucherRes.data) ? voucherRes.data : []);
            })
            .catch((error) => {
                console.error(error);
                toast.error(error instanceof Error ? error.message : "Gagal memuat detail member.");
                setMember(null);
                setTransactions([]);
                setVouchers([]);
            })
            .finally(() => setLoading(false));
    }, [memberId]);

    const filteredTransactions = useMemo(
        () => filterTransactionsByDate(transactions, rangePreset, startDate, endDate),
        [transactions, rangePreset, startDate, endDate]
    );
    const totalSpend = useMemo(
        () => filteredTransactions.reduce((sum, trx) => sum + (trx.actualPrice || 0), 0),
        [filteredTransactions]
    );
    const averageSpend = filteredTransactions.length === 0 ? 0 : totalSpend / filteredTransactions.length;
    const treatmentStats = useMemo(() => buildItemStats(filteredTransactions, "Single"), [filteredTransactions]);
    const packageStats = useMemo(() => buildItemStats(filteredTransactions, "Package"), [filteredTransactions]);
    const paymentStats = useMemo(() => buildPaymentStats(filteredTransactions), [filteredTransactions]);
    const spendTrend = useMemo(() => buildSpendTrend(filteredTransactions), [filteredTransactions]);
    const activeVoucherCount = vouchers.filter((voucher) => voucher.status === "ACTIVE").length;

    return (
        <AppShell
            title={member?.name || "Detail Member"}
            subtitle="Ringkasan profil, transaksi, voucher, treatment, dan paket favorit member."
            actions={
                <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate("/members")}>
                    Kembali
                </Button>
            }
        >
            <Toaster />

            <Paper sx={{ p: 3, borderRadius: 1, mb: 3 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems={{ md: "center" }}>
                    <Avatar sx={{ width: 64, height: 64, borderRadius: 1, bgcolor: "primary.main", fontSize: 28 }}>
                        {member?.name?.slice(0, 1).toUpperCase() || "M"}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h5" fontWeight={800}>
                            {member?.name || (loading ? "Memuat member..." : "Member tidak ditemukan")}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {member?.phoneNumber || "-"} | Lahir: {member?.birthDate || "-"} | Alamat: {member?.address || "-"}
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip icon={<TodayIcon />} label={`Last visit: ${formatDateTime(member?.lastVisitDate || "")}`} />
                        <Chip icon={<VoucherIcon />} label={`${activeVoucherCount} voucher aktif`} color="secondary" />
                    </Stack>
                </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, mb: 3 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} justifyContent="space-between">
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                            Filter Transaksi
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Angka, grafik, dan riwayat di bawah mengikuti tanggal yang dipilih.
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
                        <Typography variant="caption" color="text.secondary">Total Belanja</Typography>
                        <Typography variant="h5" fontWeight={800}>{formatCurrency(totalSpend)}</Typography>
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
                        <Typography variant="caption" color="text.secondary">Rata-rata Belanja</Typography>
                        <Typography variant="h5" fontWeight={800}>{formatCurrency(averageSpend)}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Lifetime Visit</Typography>
                        <Typography variant="h5" fontWeight={800}>{member?.totalVisitCount ?? 0}x</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <MoneyIcon color="primary" />
                            <Typography variant="h6">Tren Belanja</Typography>
                        </Stack>
                        <Box sx={{ width: "100%", height: 260 }}>
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
                                            formatter={(value) => [formatCurrency(Number(value)), "Belanja"]}
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
                            <ReceiptIcon color="primary" />
                            <Typography variant="h6">Metode Pembayaran</Typography>
                        </Stack>
                        <Box sx={{ width: "100%", height: 260 }}>
                            {paymentStats.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                    <Typography variant="body2" color="text.secondary">Belum ada transaksi.</Typography>
                                </Stack>
                            ) : (
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={paymentStats} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                                            {paymentStats.map((entry, index) => (
                                                <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={chartTooltipStyle}
                                            formatter={(value) => [`${Number(value).toLocaleString("id-ID")} transaksi`, "Jumlah"]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <SpaIcon color="primary" />
                            <Typography variant="h6">Treatment Favorit</Typography>
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
                                            formatter={(value) => [`${Number(value).toLocaleString("id-ID")} kali`, "Diambil"]}
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
                        <Typography variant="h6" sx={{ mb: 2 }}>Paket Favorit</Typography>
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
                                            formatter={(value) => [`${Number(value).toLocaleString("id-ID")} kali`, "Diambil"]}
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
                            Transaksi terbaru member ini.
                        </Typography>
                    </Box>
                    <Chip label={`${filteredTransactions.length} transaksi`} variant="outlined" />
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Waktu</TableCell>
                                <TableCell>Stylist</TableCell>
                                <TableCell>Layanan</TableCell>
                                <TableCell>Pembayaran</TableCell>
                                <TableCell align="right">Total</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTransactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        {loading ? "Memuat transaksi..." : "Belum ada transaksi."}
                                    </TableCell>
                                </TableRow>
                            ) : filteredTransactions.map((trx) => (
                                <TableRow key={trx.id} hover>
                                    <TableCell>{formatDateTime(trx.date)}</TableCell>
                                    <TableCell>{trx.employee?.name || "-"}</TableCell>
                                    <TableCell>{trx.items?.map(getItemName).join(", ") || "-"}</TableCell>
                                    <TableCell>{trx.paymentMethod}</TableCell>
                                    <TableCell align="right">{formatCurrency(trx.actualPrice || 0)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </AppShell>
    );
}
