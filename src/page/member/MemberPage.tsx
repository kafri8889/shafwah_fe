import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    InputAdornment,
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
    Tooltip,
    Typography
} from "@mui/material";
import {
    Add as AddIcon,
    CardGiftcard as VoucherIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    EmojiEvents as TrophyIcon,
    OpenInNew as DetailIcon,
    PeopleAlt as PeopleIcon,
    PersonSearch as PersonSearchIcon,
    Phone as PhoneIcon,
    Search as SearchIcon,
    Spa as SpaIcon,
    Stars as StarsIcon,
    Today as TodayIcon
} from "@mui/icons-material";
import toast, {Toaster} from "react-hot-toast";
import type {SxProps, Theme} from "@mui/material/styles";
import {Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis} from "recharts";
import AppShell from "../../components/AppShell.tsx";
import type {Customer, CustomerTransaction, CustomerTransactionItem, MemberVoucher} from "../../api/types.ts";
import {customerService} from "../../api/service/customerService.ts";
import {transactionService} from "../../api/service/transactionService.ts";
import {voucherService} from "../../api/service/voucherService.ts";

type MemberFormState = {
    name: string;
    phoneNumber: string;
    address: string;
    birthDate: string;
    visitCount: string;
    totalVisitCount: string;
    lastVisitDate: string;
};

type MemberTrendPoint = {
    label: string;
    value: number;
};

type TreatmentStat = {
    name: string;
    count: number;
};

type MarqueeTextProps = {
    text: string;
    variant?: "caption" | "body2" | "h5";
    color?: string;
    fontWeight?: number;
    sx?: SxProps<Theme>;
};

const chartTooltipStyle = {
    borderRadius: 8,
    border: "1px solid rgba(143, 94, 54, 0.18)",
    boxShadow: "0 12px 28px rgba(31, 24, 18, 0.12)"
};

const emptyForm: MemberFormState = {
    name: "",
    phoneNumber: "",
    address: "",
    birthDate: "",
    visitCount: "0",
    totalVisitCount: "0",
    lastVisitDate: ""
};

function parseDate(value: string) {
    if (!value) return null;
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const parsed = new Date(normalized);
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

function formatVoucherExpiry(voucher: MemberVoucher) {
    if (voucher.neverExpires || voucher.template.neverExpires || voucher.template.validityDays < 1) {
        return "Tidak kadaluarsa";
    }

    return formatDateTime(voucher.expiresAt);
}

function toDateTimeInput(value: string) {
    const parsed = parseDate(value);
    if (!parsed) return "";

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    const hour = String(parsed.getHours()).padStart(2, "0");
    const minute = String(parsed.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toApiDateTime(value: string) {
    if (!value) return new Date().toISOString();
    return value.length === 16 ? `${value}:00` : value;
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function buildForm(member: Customer): MemberFormState {
    return {
        name: member.name || "",
        phoneNumber: member.phoneNumber || "",
        address: member.address || "",
        birthDate: member.birthDate || "",
        visitCount: String(member.visitCount ?? 0),
        totalVisitCount: String(member.totalVisitCount ?? 0),
        lastVisitDate: toDateTimeInput(member.lastVisitDate)
    };
}

function buildMonthlyTrend(members: Customer[]): MemberTrendPoint[] {
    const now = new Date();
    const points = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
        return {
            label: date.toLocaleDateString("id-ID", { month: "short" }),
            value: 0,
            month: date.getMonth(),
            year: date.getFullYear()
        };
    });

    members.forEach((member) => {
        const parsed = parseDate(member.lastVisitDate);
        if (!parsed) return;

        const point = points.find((item) => item.month === parsed.getMonth() && item.year === parsed.getFullYear());
        if (point) point.value += 1;
    });

    return points.map(({ label, value }) => ({ label, value }));
}

function formatDateInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getTreatmentName(item: CustomerTransactionItem) {
    if (item.treatmentType === "Package" && item.treatmentPackage) {
        return `[PAKET] ${item.treatmentPackage.title}`;
    }

    if (item.treatment) {
        return item.treatment.title;
    }

    return "Layanan tidak diketahui";
}

function buildTreatmentStats(transactions: CustomerTransaction[], customerId?: number | null): TreatmentStat[] {
    const counts = new Map<string, number>();

    transactions.forEach((trx) => {
        if (customerId && trx.customer?.id !== customerId) return;

        trx.items?.forEach((item) => {
            const name = getTreatmentName(item);
            counts.set(name, (counts.get(name) || 0) + 1);
        });
    });

    return Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

function MarqueeText({ text, variant = "body2", color, fontWeight, sx }: MarqueeTextProps) {
    return (
        <Box
            title={text}
            sx={[
                {
                    minWidth: 0,
                    maxWidth: "100%",
                    overflow: "hidden",
                    "&:hover .marqueeText, &:focus-within .marqueeText": {
                        animation: "memberMarquee 7s linear infinite"
                    },
                    "@keyframes memberMarquee": {
                        "0%, 12%": { transform: "translateX(0)" },
                        "88%, 100%": { transform: "translateX(-45%)" }
                    }
                },
                ...(Array.isArray(sx) ? sx : [sx])
            ]}
        >
            <Typography
                className="marqueeText"
                variant={variant}
                color={color}
                fontWeight={fontWeight}
                tabIndex={0}
                sx={{
                    display: "inline-block",
                    minWidth: "100%",
                    whiteSpace: "nowrap",
                    transition: "transform 180ms ease"
                }}
            >
                {text}
            </Typography>
        </Box>
    );
}

export default function MemberPage() {
    const navigate = useNavigate();
    const [members, setMembers] = useState<Customer[]>([]);
    const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [birthDateSearch, setBirthDateSearch] = useState("");
    const [datePreset, setDatePreset] = useState("all");
    const [startDate, setStartDate] = useState(formatDateInput(new Date()));
    const [endDate, setEndDate] = useState(formatDateInput(new Date()));
    const [editingMember, setEditingMember] = useState<Customer | null>(null);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<Customer | null>(null);
    const [voucherDialogMember, setVoucherDialogMember] = useState<Customer | null>(null);
    const [memberVouchers, setMemberVouchers] = useState<MemberVoucher[]>([]);
    const [voucherLoading, setVoucherLoading] = useState(false);
    const [form, setForm] = useState<MemberFormState>(emptyForm);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const [res, transactionRes] = await Promise.all([
                customerService.getAll(),
                transactionService.getAll()
            ]);

            if (res.success && Array.isArray(res.data)) {
                setMembers(res.data);
            } else {
                setMembers([]);
            }

            if (transactionRes.success && Array.isArray(transactionRes.data)) {
                setTransactions(transactionRes.data);
            } else {
                setTransactions([]);
            }
        } catch (error) {
            console.error(error);
            toast.error("Gagal memuat data member.");
            setMembers([]);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const filteredMembers = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        const sorted = [...members].sort((a, b) => (b.totalVisitCount || 0) - (a.totalVisitCount || 0));

        const now = new Date();
        let rangeStart: Date | null = null;
        let rangeEnd: Date | null = null;

        if (datePreset === "30d") {
            rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        } else if (datePreset === "90d") {
            rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89);
        } else if (datePreset === "year") {
            rangeStart = new Date(now.getFullYear(), 0, 1);
            rangeEnd = new Date(now.getFullYear() + 1, 0, 1);
        } else if (datePreset === "custom" && startDate && endDate) {
            rangeStart = new Date(startDate);
            rangeEnd = new Date(endDate);
            rangeEnd.setHours(23, 59, 59, 999);
        }

        return sorted.filter((member) =>
            (!keyword ||
                member.name.toLowerCase().includes(keyword) ||
                member.phoneNumber.toLowerCase().includes(keyword) ||
                member.address.toLowerCase().includes(keyword) ||
                (member.birthDate || "").includes(keyword)) &&
            (!birthDateSearch || member.birthDate === birthDateSearch) &&
            (() => {
                const parsed = parseDate(member.lastVisitDate);
                if (!rangeStart && !rangeEnd) return true;
                if (!parsed) return false;
                if (rangeStart && parsed < rangeStart) return false;
                if (rangeEnd && parsed >= rangeEnd) return false;
                return true;
            })()
        );
    }, [members, searchTerm, birthDateSearch, datePreset, startDate, endDate]);

    const topMember = useMemo(() => {
        return [...filteredMembers].sort((a, b) => (b.totalVisitCount || 0) - (a.totalVisitCount || 0))[0] || null;
    }, [filteredMembers]);

    const activeMembers = useMemo(() => filteredMembers.filter((member) => (member.totalVisitCount || 0) > 1).length, [filteredMembers]);
    const totalVisits = useMemo(() => filteredMembers.reduce((sum, member) => sum + (member.totalVisitCount || 0), 0), [filteredMembers]);
    const averageVisits = filteredMembers.length === 0 ? 0 : totalVisits / filteredMembers.length;
    const recentMembers = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        return filteredMembers.filter((member) => {
            const parsed = parseDate(member.lastVisitDate);
            return parsed ? parsed >= thirtyDaysAgo : false;
        }).length;
    }, [filteredMembers]);
    const monthlyTrend = useMemo(() => buildMonthlyTrend(filteredMembers), [filteredMembers]);
    const topMembers = useMemo(() => {
        return [...filteredMembers]
            .sort((a, b) => (b.totalVisitCount || 0) - (a.totalVisitCount || 0))
            .slice(0, 5);
    }, [filteredMembers]);
    const topMemberChartData = useMemo(() => {
        return topMembers.map((member) => ({
            name: member.name,
            visits: member.totalVisitCount || 0
        }));
    }, [topMembers]);
    const topTreatmentOverall = useMemo(() => {
        const memberIds = new Set(filteredMembers.map((member) => member.id).filter(Boolean));
        const scopedTransactions = transactions.filter((trx) => trx.customer?.id && memberIds.has(trx.customer.id));
        return buildTreatmentStats(scopedTransactions)[0] || null;
    }, [transactions, filteredMembers]);
    const treatmentStatsByMember = useMemo(() => {
        const map = new Map<number, TreatmentStat[]>();
        members.forEach((member) => {
            if (member.id) {
                map.set(member.id, buildTreatmentStats(transactions, member.id));
            }
        });
        return map;
    }, [members, transactions]);

    const openEditDialog = (member: Customer) => {
        setEditingMember(member);
        setCreateDialogOpen(false);
        setForm(buildForm(member));
    };

    const openCreateDialog = () => {
        setEditingMember(null);
        setCreateDialogOpen(true);
        setForm(emptyForm);
    };

    const closeMemberDialog = () => {
        setEditingMember(null);
        setCreateDialogOpen(false);
        setForm(emptyForm);
    };

    const handleCreate = () => {
        const payload = {
            name: form.name.trim(),
            phoneNumber: form.phoneNumber.trim(),
            address: form.address.trim() || "-",
            birthDate: form.birthDate || null,
            visitCount: 0,
            totalVisitCount: 0
        };

        if (!payload.name) {
            toast.error("Nama member wajib diisi.");
            return;
        }

        const promise = customerService.create(payload).then((res) => {
            if (!res.success || !res.data) {
                throw new Error(res.message || "Gagal menambahkan member.");
            }

            setMembers((prev) => [res.data!, ...prev]);
            closeMemberDialog();
            return res;
        });

        toast.promise(promise, {
            loading: "Menambahkan member...",
            success: "Member berhasil ditambahkan.",
            error: (error: unknown) => getErrorMessage(error, "Gagal menambahkan member.")
        }).then(() => {});
    };

    const handleUpdate = () => {
        if (!editingMember?.id) return;

        const payload = {
            name: form.name.trim(),
            phoneNumber: form.phoneNumber.trim(),
            address: form.address.trim() || "-",
            birthDate: form.birthDate || null,
            visitCount: Math.max(0, Number(form.visitCount) || 0),
            totalVisitCount: Math.max(0, Number(form.totalVisitCount) || 0),
            lastVisitDate: toApiDateTime(form.lastVisitDate)
        };

        if (!payload.name) {
            toast.error("Nama member wajib diisi.");
            return;
        }

        const promise = customerService.update(editingMember.id, payload).then((res) => {
            if (!res.success || !res.data) {
                throw new Error(res.message || "Gagal memperbarui member.");
            }

            setMembers((prev) => prev.map((item) => item.id === res.data?.id ? res.data : item));
            closeMemberDialog();
            return res;
        });

        toast.promise(promise, {
            loading: "Menyimpan perubahan member...",
            success: "Member berhasil diperbarui.",
            error: (error: unknown) => getErrorMessage(error, "Gagal memperbarui member.")
        }).then(() => {});
    };

    const handleDelete = () => {
        if (!memberToDelete?.id) return;

        const id = memberToDelete.id;
        const promise = customerService.delete(id).then((res) => {
            if (!res.success) {
                throw new Error(res.message || "Gagal menghapus member.");
            }

            setMembers((prev) => prev.filter((item) => item.id !== id));
            setMemberToDelete(null);
            return res;
        });

        toast.promise(promise, {
            loading: "Menghapus member...",
            success: "Member berhasil dihapus.",
            error: (error: unknown) => getErrorMessage(error, "Gagal menghapus member. Cek apakah member masih punya transaksi.")
        }).then(() => {});
    };

    const openVoucherDialog = (member: Customer) => {
        setVoucherDialogMember(member);
        setMemberVouchers([]);

        if (!member.id) return;

        setVoucherLoading(true);
        voucherService.getMemberVouchers(member.id)
            .then((res) => {
                setMemberVouchers(res.success && Array.isArray(res.data) ? res.data : []);
            })
            .catch((error) => {
                console.error(error);
                toast.error("Gagal memuat voucher member.");
            })
            .finally(() => setVoucherLoading(false));
    };

    const summaryData = [
        {
            title: "Total Member",
            value: filteredMembers.length.toLocaleString("id-ID"),
            subtext: `${activeMembers} member repeat`,
            icon: <PeopleIcon sx={{ color: "white" }} />,
            color: "#B47B4C"
        },
        {
            title: "Member Teraktif",
            value: topMember?.name || "-",
            subtext: topMember ? `${topMember.totalVisitCount} total kunjungan` : "Belum ada data",
            icon: <TrophyIcon sx={{ color: "white" }} />,
            color: "#C4705D"
        },
        {
            title: "Rata-rata Visit",
            value: averageVisits.toLocaleString("id-ID", { maximumFractionDigits: 1 }),
            subtext: "Kunjungan per member",
            icon: <StarsIcon sx={{ color: "white" }} />,
            color: "#D1A45E"
        },
        {
            title: "Top Perawatan",
            value: topTreatmentOverall?.name || "-",
            subtext: topTreatmentOverall ? `${topTreatmentOverall.count} kali diambil` : "Belum ada transaksi",
            icon: <SpaIcon sx={{ color: "white" }} />,
            color: "#8F5E36"
        },
        {
            title: "Aktif 30 Hari",
            value: recentMembers.toLocaleString("id-ID"),
            subtext: "Di data hasil filter",
            icon: <TodayIcon sx={{ color: "white" }} />,
            color: "#6C8A6C"
        }
    ];

    return (
        <AppShell
            title="Manajemen Member"
            subtitle="Kelola data member, pantau loyalitas, dan lihat pola kunjungan pelanggan salon."
            actions={
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip
                        icon={<PersonSearchIcon />}
                        label={`${filteredMembers.length} data tampil`}
                        color="secondary"
                    />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={openCreateDialog}
                        sx={{ borderRadius: 1 }}
                    >
                        Tambah Member
                    </Button>
                </Stack>
            }
        >
            <Toaster />

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, mb: 3 }}>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems={{ lg: "center" }} justifyContent="space-between">
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                            Filter Member
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Filter tanggal memakai data visit terakhir member.
                        </Typography>
                    </Box>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                        <TextField
                            size="small"
                            placeholder="Cari nama, telp, alamat, tanggal lahir..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            sx={{ minWidth: { xs: "100%", md: 280 } }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label="Tanggal lahir"
                            value={birthDateSearch}
                            onChange={(event) => setBirthDateSearch(event.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{ minWidth: 170 }}
                        />
                        <TextField
                            select
                            size="small"
                            label="Visit terakhir"
                            value={datePreset}
                            onChange={(event) => setDatePreset(event.target.value)}
                            sx={{ minWidth: 170 }}
                        >
                            <MenuItem value="all">Semua tanggal</MenuItem>
                            <MenuItem value="30d">30 hari terakhir</MenuItem>
                            <MenuItem value="90d">90 hari terakhir</MenuItem>
                            <MenuItem value="year">Tahun ini</MenuItem>
                            <MenuItem value="custom">Custom</MenuItem>
                        </TextField>
                        {datePreset === "custom" && (
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
                {summaryData.map((card) => (
                    <Grid key={card.title} size={{ xs: 12, sm: 6, lg: 2.4 }}>
                        <Card sx={{ height: "100%", borderRadius: 1 }}>
                            <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                                <Avatar variant="rounded" sx={{ bgcolor: card.color, borderRadius: 1, width: 46, height: 46 }}>
                                    {card.icon}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                        {card.title}
                                    </Typography>
                                    <MarqueeText text={card.value} variant="h5" fontWeight={800} />
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        {card.subtext}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={3} alignItems="flex-start" sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 1 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
                            <Box>
                                <Typography variant="h6">Trend Visit Terakhir</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Jumlah member yang visit terakhirnya berada di enam bulan terakhir.
                                </Typography>
                            </Box>
                            <Chip label={`${recentMembers} aktif`} color="secondary" variant="outlined" />
                        </Stack>
                        <Box sx={{ width: "100%", height: 220 }}>
                            <ResponsiveContainer>
                                <BarChart data={monthlyTrend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(143, 94, 54, 0.14)" />
                                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                    <RechartsTooltip
                                        cursor={{ fill: "rgba(180, 123, 76, 0.08)" }}
                                        contentStyle={chartTooltipStyle}
                                        formatter={(value) => [`${Number(value).toLocaleString("id-ID")} member`, "Visit terakhir"]}
                                    />
                                    <Bar
                                        dataKey="value"
                                        name="Member"
                                        fill="#B47B4C"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={46}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper sx={{ p: 2.5, borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <TrophyIcon color="primary" />
                            <Box>
                                <Typography variant="h6">Top Member</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Berdasarkan total kunjungan lifetime.
                                </Typography>
                            </Box>
                        </Stack>
                        <Box sx={{ width: "100%", height: 190, mb: 2 }}>
                            {topMemberChartData.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Belum ada data member.
                                    </Typography>
                                </Stack>
                            ) : (
                                <ResponsiveContainer>
                                    <BarChart
                                        data={topMemberChartData}
                                        layout="vertical"
                                        margin={{ top: 4, right: 12, left: 10, bottom: 4 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(143, 94, 54, 0.14)" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={132}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <RechartsTooltip
                                            cursor={{ fill: "rgba(180, 123, 76, 0.08)" }}
                                            contentStyle={chartTooltipStyle}
                                            formatter={(value) => [`${Number(value).toLocaleString("id-ID")} kunjungan`, "Total visit"]}
                                        />
                                        <Bar dataKey="visits" name="Total visit" fill="#C4705D" radius={[0, 6, 6, 0]} maxBarSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                        <Stack spacing={1.25}>
                            {topMembers.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    Belum ada data member.
                                </Typography>
                            ) : topMembers.map((member, index) => (
                                <Paper
                                    key={member.id ?? member.name}
                                    variant="outlined"
                                    sx={{
                                        p: 1.25,
                                        borderRadius: 1,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 2,
                                        bgcolor: index === 0 ? "rgba(180, 123, 76, 0.10)" : "background.paper"
                                    }}
                                >
                                    <Box sx={{ minWidth: 0 }}>
                                        <MarqueeText text={`${index + 1}. ${member.name}`} fontWeight={700} />
                                        <Typography variant="caption" color="text.secondary">
                                            Last visit: {formatDateTime(member.lastVisitDate)}
                                        </Typography>
                                    </Box>
                                    <Chip label={`${member.totalVisitCount}x`} size="small" color={index === 0 ? "primary" : "default"} />
                                </Paper>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            <Paper sx={{ p: 3, borderRadius: 1 }}>
                <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="h6">Daftar Member</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Edit profil member, cek jumlah datang, dan lihat perawatan favoritnya.
                        </Typography>
                    </Box>
                    <Chip label={`${filteredMembers.length} member`} color="secondary" />
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Member</TableCell>
                                <TableCell>Tanggal Lahir</TableCell>
                                <TableCell>No Telp</TableCell>
                                <TableCell>Alamat</TableCell>
                                <TableCell align="right">Visit Tahun Ini</TableCell>
                                <TableCell align="right">Total Visit</TableCell>
                                <TableCell>Perawatan Favorit</TableCell>
                                <TableCell>Visit Terakhir</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center">
                                        Memuat member...
                                    </TableCell>
                                </TableRow>
                            ) : filteredMembers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center">
                                        Tidak ada member yang cocok.
                                    </TableCell>
                                </TableRow>
                            ) : filteredMembers.map((member) => (
                                <TableRow key={member.id ?? member.name} hover>
                                    <TableCell>
                                        <Stack direction="row" spacing={1.25} alignItems="center">
                                            <Avatar sx={{ width: 34, height: 34, borderRadius: 1, bgcolor: "primary.main" }}>
                                                {member.name.slice(0, 1).toUpperCase()}
                                            </Avatar>
                                            <Box>
                                                <MarqueeText text={member.name} fontWeight={700} sx={{ maxWidth: 180 }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    ID #{member.id ?? "-"}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{member.birthDate || "-"}</TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={0.75} alignItems="center">
                                            <PhoneIcon fontSize="small" color="action" />
                                            <Typography variant="body2">{member.phoneNumber || "-"}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 220, maxWidth: 360 }}>
                                        <MarqueeText text={member.address || "-"} />
                                    </TableCell>
                                    <TableCell align="right">{member.visitCount}</TableCell>
                                    <TableCell align="right">
                                        <Chip label={`${member.totalVisitCount}x`} size="small" color={member.totalVisitCount > 5 ? "primary" : "default"} />
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 220 }}>
                                        {(() => {
                                            const favorite = member.id ? treatmentStatsByMember.get(member.id)?.[0] : null;
                                            return favorite ? (
                                                <Stack spacing={0.25}>
                                                    <MarqueeText text={favorite.name} fontWeight={700} />
                                                    <Typography variant="caption" color="text.secondary">
                                                        {favorite.count} kali diambil
                                                    </Typography>
                                                </Stack>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">-</Typography>
                                            );
                                        })()}
                                    </TableCell>
                                    <TableCell>{formatDateTime(member.lastVisitDate)}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Edit member">
                                            <IconButton size="small" onClick={() => openEditDialog(member)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Detail member">
                                            <IconButton size="small" onClick={() => member.id && navigate(`/members/${member.id}`)}>
                                                <DetailIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Lihat voucher">
                                            <IconButton size="small" onClick={() => openVoucherDialog(member)}>
                                                <VoucherIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Hapus member">
                                            <IconButton size="small" color="error" onClick={() => setMemberToDelete(member)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={Boolean(editingMember) || createDialogOpen} onClose={closeMemberDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingMember ? "Edit Member" : "Tambah Member"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <TextField
                            label="Nama"
                            value={form.name}
                            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                            fullWidth
                        />
                        <TextField
                            label="No Telp"
                            value={form.phoneNumber}
                            onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                            fullWidth
                        />
                        <TextField
                            label="Alamat"
                            value={form.address}
                            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                            fullWidth
                            multiline
                            minRows={2}
                        />
                        <TextField
                            label="Tanggal Lahir"
                            type="date"
                            value={form.birthDate}
                            onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                            <TextField
                                label="Visit Tahun Ini"
                                type="number"
                                value={form.visitCount}
                                onChange={(event) => setForm((prev) => ({ ...prev, visitCount: event.target.value }))}
                                fullWidth
                            />
                            <TextField
                                label="Total Visit"
                                type="number"
                                value={form.totalVisitCount}
                                onChange={(event) => setForm((prev) => ({ ...prev, totalVisitCount: event.target.value }))}
                                fullWidth
                            />
                        </Stack>
                        <TextField
                            label="Visit Terakhir"
                            type="datetime-local"
                            value={form.lastVisitDate}
                            onChange={(event) => setForm((prev) => ({ ...prev, lastVisitDate: event.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeMemberDialog}>Batal</Button>
                    <Button variant="contained" onClick={editingMember ? handleUpdate : handleCreate}>
                        Simpan
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(memberToDelete)} onClose={() => setMemberToDelete(null)}>
                <DialogTitle>Hapus Member</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Yakin ingin menghapus member {memberToDelete?.name || ""}? Data yang sudah dipakai transaksi mungkin tidak bisa dihapus oleh backend.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMemberToDelete(null)}>Batal</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>Hapus</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(voucherDialogMember)} onClose={() => setVoucherDialogMember(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Voucher {voucherDialogMember?.name || ""}</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.25} sx={{ pt: 1 }}>
                        {voucherLoading ? (
                            <Typography variant="body2" color="text.secondary">Memuat voucher...</Typography>
                        ) : memberVouchers.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">Member ini belum punya voucher.</Typography>
                        ) : memberVouchers.map((voucher) => (
                            <Paper key={voucher.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                                <Stack direction="row" justifyContent="space-between" spacing={2}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={700}>{voucher.template.name}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {voucher.code} | Exp: {formatVoucherExpiry(voucher)}
                                        </Typography>
                                    </Box>
                                    <Chip label={voucher.status} size="small" color={voucher.status === "ACTIVE" ? "success" : "default"} />
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setVoucherDialogMember(null)}>Tutup</Button>
                </DialogActions>
            </Dialog>
        </AppShell>
    );
}
