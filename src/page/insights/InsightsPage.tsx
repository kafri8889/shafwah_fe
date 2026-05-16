import {
    Box,
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
    AccessTime as AccessTimeIcon,
    EmojiEvents as EmojiEventsIcon,
    Insights as InsightsIcon,
    MonetizationOn as MonetizationOnIcon,
    PeopleAlt as PeopleAltIcon,
    Spa as SpaIcon
} from "@mui/icons-material";
import {useEffect, useMemo, useState} from "react";
import {TransactionItem} from "../../api/types.ts";
import {transactionService} from "../../api/service/transactionService.ts";
import AppShell from "../../components/AppShell.tsx";

type TrendPoint = {
    label: string;
    value: number;
};

const dayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function formatCurrency(value: number) {
    return `Rp ${value.toLocaleString("id-ID")}`;
}

function buildWeeklyTrend(transactions: TransactionItem[]): TrendPoint[] {
    const counts = new Array(7).fill(0);
    transactions.forEach((trx) => {
        const date = new Date(trx.time.replace(" ", "T"));
        if (!Number.isNaN(date.getTime())) {
            const dayIndex = (date.getDay() + 6) % 7;
            counts[dayIndex] += trx.amount;
        }
    });
    return dayLabels.map((label, index) => ({
        label,
        value: counts[index]
    }));
}

function buildHourlyTrend(transactions: TransactionItem[]): TrendPoint[] {
    const counts = new Array(8).fill(0);
    const labels = ["08", "10", "12", "14", "16", "18", "20", "22"];
    transactions.forEach((trx) => {
        const date = new Date(trx.time.replace(" ", "T"));
        if (!Number.isNaN(date.getTime())) {
            const hour = date.getHours();
            const index = Math.min(Math.floor((hour - 8) / 2), 7);
            if (index >= 0) counts[index] += 1;
        }
    });
    return labels.map((label, index) => ({
        label,
        value: counts[index]
    }));
}

function buildServiceCounts(transactions: TransactionItem[]) {
    const counts = new Map<string, number>();
    transactions.forEach((trx) => {
        trx.items?.forEach((item) => {
            const key = item.name;
            counts.set(key, (counts.get(key) || 0) + 1);
        });
    });
    return Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}

function buildEmployeeCounts(transactions: TransactionItem[]) {
    const counts = new Map<string, number>();
    transactions.forEach((trx) => {
        const name = trx.employee?.name || "Unknown";
        counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}

function BarSpark({ data, maxValue }: { data: TrendPoint[]; maxValue: number }) {
    return (
        <Stack direction="row" alignItems="flex-end" spacing={1.2} sx={{ height: 120 }}>
            {data.map((point) => (
                <Box key={point.label} sx={{ textAlign: "center", flex: 1 }}>
                    <Box
                        sx={{
                            height: `${maxValue === 0 ? 6 : Math.max(6, (point.value / maxValue) * 100)}%`,
                            borderRadius: 1,
                            background: "linear-gradient(180deg, rgba(180, 123, 76, 0.9), rgba(180, 123, 76, 0.3))",
                            boxShadow: "0 6px 16px rgba(180, 123, 76, 0.2)",
                            transition: "height 300ms ease"
                        }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                        {point.label}
                    </Typography>
                </Box>
            ))}
        </Stack>
    );
}

export default function InsightsPage() {
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [rangePreset, setRangePreset] = useState("7d");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [paymentFilter, setPaymentFilter] = useState("All");
    const [serviceFilter, setServiceFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("All");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await transactionService.getAll();
                if (res?.success && Array.isArray(res.data)) {
                    setTransactions(res.data.map((record) => new TransactionItem(record)));
                } else {
                    setTransactions([]);
                }
            } catch {
                setTransactions([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const paymentOptions = useMemo(() => {
        const options = new Set<string>();
        transactions.forEach((trx) => {
            const payment = trx.originalRecord?.paymentMethod || "CASH";
            options.add(payment);
        });
        return ["All", ...Array.from(options)];
    }, [transactions]);

    const serviceOptions = useMemo(() => {
        const options = new Set<string>();
        transactions.forEach((trx) => {
            trx.items?.forEach((item) => options.add(item.name));
        });
        return ["All", ...Array.from(options)];
    }, [transactions]);

    const categoryOptions = useMemo(() => {
        const options = new Set<string>();
        transactions.forEach((trx) => {
            trx.originalRecord?.items?.forEach((item) => {
                const category = item.treatment?.category?.title || item.treatmentPackage?.category?.title;
                if (category) options.add(category);
            });
        });
        return ["All", ...Array.from(options)];
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        const now = new Date();
        let rangeStart: Date | null = null;
        let rangeEnd: Date | null = null;

        if (rangePreset === "today") {
            rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        } else if (rangePreset === "7d") {
            rangeStart = new Date(now);
            rangeStart.setDate(now.getDate() - 6);
        } else if (rangePreset === "30d") {
            rangeStart = new Date(now);
            rangeStart.setDate(now.getDate() - 29);
        } else if (rangePreset === "custom" && startDate && endDate) {
            rangeStart = new Date(startDate);
            rangeEnd = new Date(endDate);
            rangeEnd.setHours(23, 59, 59, 999);
        }

        return transactions.filter((trx) => {
            const date = new Date(trx.time.replace(" ", "T"));
            if (!Number.isNaN(date.getTime())) {
                if (rangeStart && date < rangeStart) return false;
                if (rangeEnd && date > rangeEnd) return false;
            }

            if (paymentFilter !== "All") {
                const payment = trx.originalRecord?.paymentMethod || "CASH";
                if (payment !== paymentFilter) return false;
            }

            if (serviceFilter !== "All") {
                const hasService = trx.items?.some((item) => item.name === serviceFilter);
                if (!hasService) return false;
            }

            if (categoryFilter !== "All") {
                const hasCategory = trx.originalRecord?.items?.some((item) => {
                    const category = item.treatment?.category?.title || item.treatmentPackage?.category?.title;
                    return category === categoryFilter;
                });
                if (!hasCategory) return false;
            }

            return true;
        });
    }, [transactions, rangePreset, startDate, endDate, paymentFilter, serviceFilter, categoryFilter]);

    const totalRevenue = useMemo(
        () => filteredTransactions.reduce((sum, trx) => sum + trx.amount, 0),
        [filteredTransactions]
    );

    const totalTransactions = filteredTransactions.length;
    const uniqueCustomers = useMemo(() => {
        const set = new Set(filteredTransactions.map((trx) => trx.customer?.name || trx.customer?.id));
        return set.size;
    }, [filteredTransactions]);

    const weeklyTrend = useMemo(() => buildWeeklyTrend(filteredTransactions), [filteredTransactions]);
    const hourlyTrend = useMemo(() => buildHourlyTrend(filteredTransactions), [filteredTransactions]);
    const topServices = useMemo(() => buildServiceCounts(filteredTransactions), [filteredTransactions]);
    const topEmployees = useMemo(() => buildEmployeeCounts(filteredTransactions), [filteredTransactions]);

    const weeklyMax = Math.max(...weeklyTrend.map((item) => item.value), 0);
    const hourlyMax = Math.max(...hourlyTrend.map((item) => item.value), 0);

    return (
        <AppShell
            title="Insights"
            subtitle="Ringkasan bisnis dan operasional yang mudah dipahami."
            actions={<Chip icon={<InsightsIcon />} label="Business + Operasional" color="secondary" />}
        >
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, mb: 3 }}>
                <Stack spacing={2}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                        <TextField
                            select
                            size="small"
                            label="Range"
                            value={rangePreset}
                            onChange={(e) => setRangePreset(e.target.value)}
                            sx={{ minWidth: 140 }}
                        >
                            <MenuItem value="today">Hari ini</MenuItem>
                            <MenuItem value="7d">7 hari</MenuItem>
                            <MenuItem value="30d">30 hari</MenuItem>
                            <MenuItem value="custom">Custom</MenuItem>
                        </TextField>
                        {rangePreset === "custom" && (
                            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                                <TextField
                                    size="small"
                                    type="date"
                                    label="Dari"
                                    InputLabelProps={{ shrink: true }}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                                <TextField
                                    size="small"
                                    type="date"
                                    label="Sampai"
                                    InputLabelProps={{ shrink: true }}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </Stack>
                        )}
                        <TextField
                            select
                            size="small"
                            label="Payment"
                            value={paymentFilter}
                            onChange={(e) => setPaymentFilter(e.target.value)}
                            sx={{ minWidth: 150 }}
                        >
                            {paymentOptions.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label="Service"
                            value={serviceFilter}
                            onChange={(e) => setServiceFilter(e.target.value)}
                            sx={{ minWidth: 170 }}
                        >
                            {serviceOptions.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label="Kategori"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            sx={{ minWidth: 170 }}
                        >
                            {categoryOptions.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                        <Chip label={`${totalTransactions} transaksi`} color="secondary" />
                        <Chip label={`${uniqueCustomers} pelanggan unik`} variant="outlined" />
                        <Chip label={formatCurrency(totalRevenue)} variant="outlined" />
                        <Typography variant="caption" color="text.secondary">
                            {loading ? "Memuat data terbaru..." : "Filter diterapkan ke semua grafik dan tabel."}
                        </Typography>
                    </Stack>
                </Stack>
            </Paper>

            <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ mb: 4 }}>
                <Paper
                    variant="outlined"
                    sx={{
                        p: 2.5,
                        borderRadius: 1,
                        flex: 1,
                        background: "linear-gradient(135deg, rgba(180, 123, 76, 0.18), rgba(255, 248, 240, 0.7))"
                    }}
                >
                    <Stack spacing={1}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Total Omzet
                        </Typography>
                        <Typography variant="h4">{formatCurrency(totalRevenue)}</Typography>
                        <Divider sx={{ borderColor: "rgba(180, 123, 76, 0.2)" }} />
                        <Stack direction="row" spacing={2} alignItems="center">
                            <PeopleAltIcon fontSize="small" color="action" />
                            <Typography variant="body2">{uniqueCustomers} pelanggan</Typography>
                            <MonetizationOnIcon fontSize="small" color="action" />
                            <Typography variant="body2">{totalTransactions} transaksi</Typography>
                        </Stack>
                    </Stack>
                </Paper>
                <Paper sx={{ p: 3, borderRadius: 1, flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Highlight
                    </Typography>
                    <Stack spacing={1.2}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip label={`Top layanan: ${topServices[0]?.name || "-"}`} color="secondary" />
                            <Chip label={`Stylist teraktif: ${topEmployees[0]?.name || "-"}`} variant="outlined" />
                                </Stack>
                        <Typography variant="body2" color="text.secondary">
                            {loading ? "Memuat data terbaru..." : "Gunakan filter untuk membandingkan performa per layanan dan kategori."}
                        </Typography>
                    </Stack>
                </Paper>
            </Stack>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <MonetizationOnIcon color="primary" />
                            <Typography variant="h6">Tren Omzet Mingguan</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Ringkas pendapatan 7 hari terakhir dari semua transaksi.
                        </Typography>
                        <BarSpark data={weeklyTrend} maxValue={weeklyMax} />
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <AccessTimeIcon color="primary" />
                            <Typography variant="h6">Jam Ramai</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Volume transaksi tiap dua jam untuk menata shift.
                        </Typography>
                        <BarSpark data={hourlyTrend} maxValue={hourlyMax} />
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <SpaIcon color="primary" />
                            <Typography variant="h6">Layanan Terfavorit</Typography>
                        </Stack>
                        <Stack spacing={1.5}>
                            {topServices.length === 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    {loading ? "Memuat data..." : "Belum ada data layanan."}
                                </Typography>
                            )}
                            {topServices.map((service, index) => (
                                <Paper
                                    key={service.name}
                                    variant="outlined"
                                    sx={{
                                        p: 1.5,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        borderRadius: 1,
                                        backgroundColor: "rgba(255, 248, 240, 0.8)"
                                    }}
                                >
                                    <Stack>
                                        <Typography variant="body2" fontWeight={600}>
                                            {index + 1}. {service.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {service.count} transaksi
                                        </Typography>
                                    </Stack>
                                    <Chip label="Top" size="small" color="secondary" />
                                </Paper>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <EmojiEventsIcon color="primary" />
                            <Typography variant="h6">Performa Stylist</Typography>
                        </Stack>
                        <Stack spacing={1.5}>
                            {topEmployees.length === 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    {loading ? "Memuat data..." : "Belum ada data stylist."}
                                </Typography>
                            )}
                            {topEmployees.map((employee, index) => (
                                <Paper
                                    key={employee.name}
                                    variant="outlined"
                                    sx={{
                                        p: 1.5,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        borderRadius: 1,
                                        backgroundColor: "rgba(255, 248, 240, 0.8)"
                                    }}
                                >
                                    <Stack>
                                        <Typography variant="body2" fontWeight={600}>
                                            {index + 1}. {employee.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {employee.count} transaksi
                                        </Typography>
                                    </Stack>
                                    <Chip label="Top" size="small" color="primary" />
                                </Paper>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            <Paper sx={{ p: 3, borderRadius: 1, mt: 3 }}>
                <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="h6">Transaksi</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Detail transaksi berdasarkan filter aktif.
                        </Typography>
                    </Box>
                    <Chip label={`${filteredTransactions.length} data`} variant="outlined" />
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Waktu</TableCell>
                                <TableCell>Pelanggan</TableCell>
                                <TableCell>Stylist</TableCell>
                                <TableCell>Layanan</TableCell>
                                <TableCell>Pembayaran</TableCell>
                                <TableCell align="right">Omzet</TableCell>
                    <TableCell align="right">Trend</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredTransactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        {loading ? "Memuat data..." : "Tidak ada data sesuai filter."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTransactions.slice(0, 20).map((trx) => (
                                    <TableRow key={trx.id} hover>
                                        <TableCell>{trx.time}</TableCell>
                                        <TableCell>{trx.customer?.name || "-"}</TableCell>
                                        <TableCell>{trx.employee?.name || "-"}</TableCell>
                                        <TableCell sx={{ maxWidth: 220, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {trx.service}
                                        </TableCell>
                                        <TableCell>{trx.originalRecord?.paymentMethod || "CASH"}</TableCell>
                                        <TableCell align="right">{formatCurrency(trx.amount)}</TableCell>
                                        <TableCell align="right">
                                            <Box
                                                sx={{
                                                    height: 10,
                                                    borderRadius: 1,
                                                    background: "linear-gradient(90deg, rgba(180, 123, 76, 0.65), rgba(180, 123, 76, 0.2))",
                                                    width: `${Math.min(100, Math.max(12, (trx.amount / Math.max(totalRevenue, 1)) * 140))}%`
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {filteredTransactions.length > 20 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
                        Menampilkan 20 transaksi teratas. Filter lagi untuk mempersempit hasil.
                    </Typography>
                )}
            </Paper>
        </AppShell>
    );
}
