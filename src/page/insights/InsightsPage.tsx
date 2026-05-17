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
    PersonSearch as PersonSearchIcon,
    Spa as SpaIcon
} from "@mui/icons-material";
import {useEffect, useMemo, useState} from "react";
import {TransactionItem} from "../../api/types.ts";
import {transactionService} from "../../api/service/transactionService.ts";
import AppShell from "../../components/AppShell.tsx";
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

type TrendPoint = {
    label: string;
    value: number;
};

type CountPoint = {
    name: string;
    count: number;
};

const dayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const chartColors = ["#B47B4C", "#C4705D", "#6C8A6C", "#D1A45E", "#8F5E36"];

const chartTooltipStyle = {
    borderRadius: 8,
    border: "1px solid rgba(143, 94, 54, 0.18)",
    boxShadow: "0 12px 28px rgba(31, 24, 18, 0.12)"
};

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

function buildServiceCounts(transactions: TransactionItem[], treatmentType?: "Single" | "Package") {
    const counts = new Map<string, number>();
    transactions.forEach((trx) => {
        trx.items?.forEach((item) => {
            if (treatmentType && item.treatmentType !== treatmentType) return;
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

function buildPaymentCounts(transactions: TransactionItem[]): CountPoint[] {
    const counts = new Map<string, number>();
    transactions.forEach((trx) => {
        const payment = trx.originalRecord?.paymentMethod || "CASH";
        counts.set(payment, (counts.get(payment) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}

function getCustomerKey(trx: TransactionItem) {
    return trx.customer?.id ? String(trx.customer.id) : trx.customer?.name || "";
}

function buildMemberOptions(transactions: TransactionItem[]) {
    const options = new Map<string, string>();
    transactions.forEach((trx) => {
        const key = getCustomerKey(trx);
        const name = trx.customer?.name || "-";
        if (key) options.set(key, name);
    });
    return Array.from(options.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
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
    const [memberFilter, setMemberFilter] = useState("All");

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

    const memberOptions = useMemo(() => buildMemberOptions(transactions), [transactions]);

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

            if (memberFilter !== "All" && getCustomerKey(trx) !== memberFilter) {
                return false;
            }

            return true;
        });
    }, [transactions, rangePreset, startDate, endDate, paymentFilter, serviceFilter, categoryFilter, memberFilter]);

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
    const topTreatments = useMemo(() => buildServiceCounts(filteredTransactions, "Single"), [filteredTransactions]);
    const topPackages = useMemo(() => buildServiceCounts(filteredTransactions, "Package"), [filteredTransactions]);
    const topEmployees = useMemo(() => buildEmployeeCounts(filteredTransactions), [filteredTransactions]);
    const paymentCounts = useMemo(() => buildPaymentCounts(filteredTransactions), [filteredTransactions]);
    const selectedMemberName = memberOptions.find((member) => member.id === memberFilter)?.name || "";
    const memberAverageSpend = totalTransactions === 0 ? 0 : totalRevenue / totalTransactions;

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
                            label="Member"
                            value={memberFilter}
                            onChange={(e) => setMemberFilter(e.target.value)}
                            sx={{ minWidth: 190 }}
                        >
                            <MenuItem value="All">Semua member</MenuItem>
                            {memberOptions.map((option) => (
                                <MenuItem key={option.id} value={option.id}>
                                    {option.name}
                                </MenuItem>
                            ))}
                        </TextField>
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
                        {memberFilter !== "All" && (
                            <Chip icon={<PersonSearchIcon />} label={selectedMemberName} color="primary" variant="outlined" />
                        )}
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

            <Paper sx={{ p: 3, borderRadius: 1, mb: 3 }}>
                {memberFilter === "All" ? (
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <PersonSearchIcon color="primary" />
                                <Typography variant="h6">Insight Member</Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                                Pilih satu member di filter atas untuk melihat total belanja, treatment, paket, payment, stylist, dan riwayatnya.
                            </Typography>
                        </Box>
                        <Chip label={`${memberOptions.length} member tersedia`} color="secondary" variant="outlined" />
                    </Stack>
                ) : (
                    <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                <PersonSearchIcon color="primary" />
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="h6">Insight Member: {selectedMemberName}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Ringkasan belanja dan treatment member sesuai filter tanggal aktif.
                                    </Typography>
                                </Box>
                            </Stack>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Total Belanja</Typography>
                                        <Typography variant="h6">{formatCurrency(totalRevenue)}</Typography>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Total Transaksi</Typography>
                                        <Typography variant="h6">{totalTransactions.toLocaleString("id-ID")}x</Typography>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Rata-rata Belanja</Typography>
                                        <Typography variant="h6">{formatCurrency(memberAverageSpend)}</Typography>
                                    </Paper>
                                </Grid>
                            </Grid>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                                <Chip label={`Treatment favorit: ${topTreatments[0]?.name || "-"}`} color="secondary" />
                                <Chip label={`Paket favorit: ${topPackages[0]?.name || "-"}`} variant="outlined" />
                                <Chip label={`Payment dominan: ${paymentCounts[0]?.name || "-"}`} variant="outlined" />
                                <Chip label={`Stylist tersering: ${topEmployees[0]?.name || "-"}`} variant="outlined" />
                            </Stack>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 320 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                Treatment yang diambil
                            </Typography>
                            <Box sx={{ width: "100%", height: 230 }}>
                                {topTreatments.length === 0 ? (
                                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Belum ada treatment pada filter ini.
                                        </Typography>
                                    </Stack>
                                ) : (
                                    <ResponsiveContainer>
                                        <BarChart data={topTreatments} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(143, 94, 54, 0.14)" />
                                            <XAxis type="number" allowDecimals={false} hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={180}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <RechartsTooltip
                                                cursor={{ fill: "rgba(108, 138, 108, 0.08)" }}
                                                contentStyle={chartTooltipStyle}
                                                formatter={(value) => [`${Number(value).toLocaleString("id-ID")} transaksi`, "Jumlah"]}
                                            />
                                            <Bar dataKey="count" name="Jumlah" fill="#6C8A6C" radius={[0, 6, 6, 0]} maxBarSize={26} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </Box>
                        </Box>
                    </Stack>
                )}
            </Paper>

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
                        <Box sx={{ width: "100%", height: 240 }}>
                            <ResponsiveContainer>
                                <BarChart data={weeklyTrend} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(143, 94, 54, 0.14)" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `${Number(value) / 1000}k`}
                                    />
                                    <RechartsTooltip
                                        cursor={{ fill: "rgba(180, 123, 76, 0.08)" }}
                                        contentStyle={chartTooltipStyle}
                                        formatter={(value) => [formatCurrency(Number(value)), "Omzet"]}
                                    />
                                    <Bar dataKey="value" name="Omzet" fill="#B47B4C" radius={[6, 6, 0, 0]} maxBarSize={54} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
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
                        <Box sx={{ width: "100%", height: 240 }}>
                            <ResponsiveContainer>
                                <BarChart data={hourlyTrend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(143, 94, 54, 0.14)" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}:00`} />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                    <RechartsTooltip
                                        cursor={{ fill: "rgba(196, 112, 93, 0.08)" }}
                                        contentStyle={chartTooltipStyle}
                                        formatter={(value) => [`${Number(value).toLocaleString("id-ID")} transaksi`, "Volume"]}
                                        labelFormatter={(label) => `${label}:00`}
                                    />
                                    <Bar dataKey="value" name="Transaksi" fill="#C4705D" radius={[6, 6, 0, 0]} maxBarSize={54} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6, xl: 3 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <MonetizationOnIcon color="primary" />
                            <Typography variant="h6">Metode Pembayaran</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Proporsi transaksi berdasarkan metode pembayaran.
                        </Typography>
                        <Box sx={{ width: "100%", height: 250 }}>
                            {paymentCounts.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {loading ? "Memuat data..." : "Belum ada data pembayaran."}
                                    </Typography>
                                </Stack>
                            ) : (
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={paymentCounts}
                                            dataKey="count"
                                            nameKey="name"
                                            innerRadius={58}
                                            outerRadius={86}
                                            paddingAngle={3}
                                        >
                                            {paymentCounts.map((entry, index) => (
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
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {paymentCounts.map((payment, index) => (
                                <Chip
                                    key={payment.name}
                                    label={`${payment.name}: ${payment.count}`}
                                    size="small"
                                    sx={{
                                        borderColor: chartColors[index % chartColors.length],
                                        color: chartColors[index % chartColors.length]
                                    }}
                                    variant="outlined"
                                />
                            ))}
                        </Stack>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6, xl: 3 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <SpaIcon color="primary" />
                            <Typography variant="h6">Layanan Terfavorit</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Layanan paling sering muncul di transaksi filter aktif.
                        </Typography>
                        <Box sx={{ width: "100%", height: 300 }}>
                            {topTreatments.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {loading ? "Memuat data..." : "Belum ada data layanan."}
                                    </Typography>
                                </Stack>
                                ) : (
                                    <ResponsiveContainer>
                                        <BarChart data={topTreatments} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(143, 94, 54, 0.14)" />
                                        <XAxis type="number" allowDecimals={false} hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={170}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <RechartsTooltip
                                            cursor={{ fill: "rgba(108, 138, 108, 0.08)" }}
                                            contentStyle={chartTooltipStyle}
                                            formatter={(value) => [`${Number(value).toLocaleString("id-ID")} transaksi`, "Jumlah"]}
                                        />
                                        <Bar dataKey="count" name="Jumlah" fill="#6C8A6C" radius={[0, 6, 6, 0]} maxBarSize={26} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6, xl: 3 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Paket Terfavorit</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Paket treatment paling sering diambil pada filter aktif.
                        </Typography>
                        <Box sx={{ width: "100%", height: 300 }}>
                            {topPackages.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {loading ? "Memuat data..." : "Belum ada data paket."}
                                    </Typography>
                                </Stack>
                            ) : (
                                <ResponsiveContainer>
                                    <BarChart data={topPackages} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(143, 94, 54, 0.14)" />
                                        <XAxis type="number" allowDecimals={false} hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={150}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <RechartsTooltip
                                            cursor={{ fill: "rgba(196, 112, 93, 0.08)" }}
                                            contentStyle={chartTooltipStyle}
                                            formatter={(value) => [`${Number(value).toLocaleString("id-ID")} transaksi`, "Jumlah"]}
                                        />
                                        <Bar dataKey="count" name="Jumlah" fill="#C4705D" radius={[0, 6, 6, 0]} maxBarSize={26} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6, xl: 3 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <EmojiEventsIcon color="primary" />
                            <Typography variant="h6">Performa Stylist</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Ranking stylist berdasarkan jumlah transaksi.
                        </Typography>
                        <Box sx={{ width: "100%", height: 300 }}>
                            {topEmployees.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {loading ? "Memuat data..." : "Belum ada data stylist."}
                                    </Typography>
                                </Stack>
                            ) : (
                                <ResponsiveContainer>
                                    <BarChart data={topEmployees} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(143, 94, 54, 0.14)" />
                                        <XAxis type="number" allowDecimals={false} hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={140}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <RechartsTooltip
                                            cursor={{ fill: "rgba(209, 164, 94, 0.08)" }}
                                            contentStyle={chartTooltipStyle}
                                            formatter={(value) => [`${Number(value).toLocaleString("id-ID")} transaksi`, "Jumlah"]}
                                        />
                                        <Bar dataKey="count" name="Jumlah" fill="#D1A45E" radius={[0, 6, 6, 0]} maxBarSize={26} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
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
