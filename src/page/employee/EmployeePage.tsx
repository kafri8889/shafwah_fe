import {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {
    Avatar,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
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
    Delete as DeleteIcon,
    Edit as EditIcon,
    OpenInNew as DetailIcon,
    Paid as CommissionIcon,
    PeopleAlt as EmployeeIcon,
} from "@mui/icons-material";
import toast, {Toaster} from "react-hot-toast";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis
} from "recharts";
import AppShell from "../../components/AppShell.tsx";
import type {CustomerTransaction, Employee} from "../../api/types.ts";
import {employeeService} from "../../api/service/employeeService.ts";
import {transactionService} from "../../api/service/transactionService.ts";
import {
    filterTransactionsByDate,
    formatCurrency,
    formatDateInput,
    getEmployeeCommission,
    getEmployeeRevenue,
    transactionHandledByEmployee,
    uniqueCustomerCount
} from "./employeeInsights.ts";

type EmployeeFormState = {
    name: string;
    role: string;
    phoneNumber: string;
    active: boolean;
};

const emptyForm: EmployeeFormState = {
    name: "",
    role: "Stylist",
    phoneNumber: "",
    active: true
};

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

const chartTooltipStyle = {
    borderRadius: 8,
    border: "1px solid rgba(143, 94, 54, 0.18)",
    boxShadow: "0 12px 28px rgba(31, 24, 18, 0.12)"
};

export default function EmployeePage() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [rangePreset, setRangePreset] = useState("all");
    const [startDate, setStartDate] = useState(formatDateInput(new Date()));
    const [endDate, setEndDate] = useState(formatDateInput(new Date()));
    const [searchTerm, setSearchTerm] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [form, setForm] = useState<EmployeeFormState>(emptyForm);

    useEffect(() => {
        Promise.all([
            employeeService.getAll(),
            transactionService.getAll()
        ])
            .then(([employeeRes, transactionRes]) => {
                setEmployees(employeeRes.success && Array.isArray(employeeRes.data) ? employeeRes.data : []);
                setTransactions(transactionRes.success && Array.isArray(transactionRes.data) ? transactionRes.data : []);
            })
            .catch((error) => {
                console.error(error);
                toast.error("Gagal memuat data employee.");
                setEmployees([]);
                setTransactions([]);
            })
            .finally(() => setLoading(false));
    }, []);

    const filteredTransactions = useMemo(
        () => filterTransactionsByDate(transactions, rangePreset, startDate, endDate),
        [transactions, rangePreset, startDate, endDate]
    );

    const employeeStats = useMemo(() => {
        const stats = new Map<number, {
            transactions: number;
            revenue: number;
            members: number;
            commission: number;
        }>();

        employees.forEach((employee) => {
            const handledTransactions = filteredTransactions.filter((trx) => transactionHandledByEmployee(trx, employee.id));
            stats.set(employee.id, {
                transactions: handledTransactions.length,
                revenue: handledTransactions.reduce((sum, trx) => sum + getEmployeeRevenue(trx, employee.id), 0),
                members: uniqueCustomerCount(handledTransactions),
                commission: handledTransactions.reduce((sum, trx) => sum + getEmployeeCommission(trx, employee.id), 0)
            });
        });

        return stats;
    }, [employees, filteredTransactions]);

    const filteredEmployees = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        return [...employees]
            .filter((employee) =>
                !keyword ||
                employee.name.toLowerCase().includes(keyword) ||
                employee.role.toLowerCase().includes(keyword) ||
                employee.phoneNumber.toLowerCase().includes(keyword)
            )
            .sort((a, b) => (employeeStats.get(b.id)?.revenue || 0) - (employeeStats.get(a.id)?.revenue || 0));
    }, [employees, searchTerm, employeeStats]);

    const totalRevenue = filteredEmployees.reduce((sum, employee) => sum + (employeeStats.get(employee.id)?.revenue || 0), 0);
    const totalHandledTransactions = filteredEmployees.reduce((sum, employee) => sum + (employeeStats.get(employee.id)?.transactions || 0), 0);
    const totalCommission = filteredEmployees.reduce((sum, employee) => sum + (employeeStats.get(employee.id)?.commission || 0), 0);
    const topEmployee = filteredEmployees[0] || null;
    const topCommissionEmployee = useMemo(() => {
        return [...filteredEmployees].sort((a, b) => (employeeStats.get(b.id)?.commission || 0) - (employeeStats.get(a.id)?.commission || 0))[0] || null;
    }, [filteredEmployees, employeeStats]);

    const employeeChartData = useMemo(() => {
        return filteredEmployees
            .map((employee) => {
                const stats = employeeStats.get(employee.id);
                return {
                    name: employee.name,
                    omzet: stats?.revenue || 0,
                    komisi: stats?.commission || 0,
                    transaksi: stats?.transactions || 0,
                    member: stats?.members || 0
                };
            })
            .filter((item) => item.omzet > 0 || item.komisi > 0 || item.transaksi > 0 || item.member > 0)
            .slice(0, 8);
    }, [filteredEmployees, employeeStats]);

    const openCreateDialog = () => {
        setEditingEmployee(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEditDialog = (employee: Employee) => {
        setEditingEmployee(employee);
        setForm({
            name: employee.name || "",
            role: employee.role || "Stylist",
            phoneNumber: employee.phoneNumber || "",
            active: employee.active ?? true
        });
        setFormOpen(true);
    };

    const closeEditDialog = () => {
        setFormOpen(false);
        setEditingEmployee(null);
        setForm(emptyForm);
    };

    const handleSave = () => {
        const payload = {
            name: form.name.trim(),
            role: form.role.trim(),
            phoneNumber: form.phoneNumber.trim(),
            active: form.active
        };

        if (!payload.name) {
            toast.error("Nama employee wajib diisi.");
            return;
        }

        const request = editingEmployee
            ? employeeService.update(editingEmployee.id, payload)
            : employeeService.create(payload);

        const promise = request.then((res) => {
            if (!res.success || !res.data) {
                throw new Error(res.message || "Gagal menyimpan employee.");
            }

            setEmployees((prev) => editingEmployee
                ? prev.map((item) => item.id === res.data?.id ? res.data : item)
                : [...prev, res.data as Employee]
            );
            closeEditDialog();
            return res;
        });

        toast.promise(promise, {
            loading: "Menyimpan employee...",
            success: "Employee berhasil disimpan.",
            error: (error: unknown) => getErrorMessage(error, "Gagal menyimpan employee.")
        }).then(() => {});
    };

    const handleDelete = () => {
        if (!employeeToDelete) return;

        const id = employeeToDelete.id;
        const promise = employeeService.delete(id).then((res) => {
            if (!res.success) {
                throw new Error(res.message || "Gagal menghapus employee.");
            }

            setEmployees((prev) => prev.filter((item) => item.id !== id));
            setTransactions((prev) => prev.filter((trx) => trx.employee?.id !== id));
            setEmployeeToDelete(null);
            return res;
        });

        toast.promise(promise, {
            loading: "Menghapus employee...",
            success: "Employee berhasil dihapus.",
            error: (error: unknown) => getErrorMessage(error, "Gagal menghapus employee. Cek apakah employee masih punya transaksi.")
        }).then(() => {});
    };

    return (
        <AppShell
            title="Manajemen Employee"
            subtitle="Kelola data stylist/employee dan pantau performa berdasarkan transaksi salon."
            actions={
                <Stack direction="row" spacing={1}>
                    <Chip icon={<EmployeeIcon />} label={`${filteredEmployees.length} employee`} color="secondary" />
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
                        Tambah
                    </Button>
                </Stack>
            }
        >
            <Toaster />

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, mb: 3 }}>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} alignItems={{ lg: "center" }} justifyContent="space-between">
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700}>Filter Employee</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Performa, member, omzet, dan komisi mengikuti filter tanggal.
                        </Typography>
                    </Box>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                        <TextField
                            size="small"
                            label="Cari"
                            placeholder="Nama, username, role..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            sx={{ minWidth: 240 }}
                        />
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
                        <Typography variant="caption" color="text.secondary">Total Employee</Typography>
                        <Typography variant="h5" fontWeight={800}>{filteredEmployees.length.toLocaleString("id-ID")}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Transaksi Ditangani</Typography>
                        <Typography variant="h5" fontWeight={800}>{totalHandledTransactions.toLocaleString("id-ID")}x</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Omzet Ditangani</Typography>
                        <Typography variant="h5" fontWeight={800}>{formatCurrency(totalRevenue)}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Total Komisi</Typography>
                        <Typography variant="h5" fontWeight={800}>{formatCurrency(totalCommission)}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" sx={{ mb: 2 }}>
                            <Box>
                                <Typography variant="h6">Omzet & Komisi per Employee</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Top omzet: {topEmployee?.name || "-"} | Top komisi: {topCommissionEmployee?.name || "-"}
                                </Typography>
                            </Box>
                            <Chip label={`${employeeChartData.length} employee aktif transaksi`} variant="outlined" />
                        </Stack>
                        <Box sx={{ width: "100%", height: 320 }}>
                            {employeeChartData.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                    <Typography variant="body2" color="text.secondary">Belum ada transaksi pada filter ini.</Typography>
                                </Stack>
                            ) : (
                                <ResponsiveContainer>
                                    <BarChart data={employeeChartData} margin={{ top: 8, right: 18, left: 8, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(143, 94, 54, 0.14)" />
                                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                                        <RechartsTooltip
                                            cursor={{ fill: "rgba(180, 123, 76, 0.08)" }}
                                            contentStyle={chartTooltipStyle}
                                            formatter={(value, name) => [formatCurrency(Number(value)), name === "omzet" ? "Omzet" : "Komisi"]}
                                        />
                                        <Legend />
                                        <Bar dataKey="omzet" name="Omzet" fill="#B47B4C" radius={[6, 6, 0, 0]} maxBarSize={38} />
                                        <Bar dataKey="komisi" name="Komisi" fill="#6C8A6C" radius={[6, 6, 0, 0]} maxBarSize={38} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, lg: 5 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" sx={{ mb: 2 }}>
                            <Box>
                                <Typography variant="h6">Transaksi & Member</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Volume kerja dan member unik yang di-handle.
                                </Typography>
                            </Box>
                            <Chip label={`${totalHandledTransactions.toLocaleString("id-ID")} transaksi`} variant="outlined" />
                        </Stack>
                        <Box sx={{ width: "100%", height: 320 }}>
                            {employeeChartData.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                    <Typography variant="body2" color="text.secondary">Belum ada aktivitas pada filter ini.</Typography>
                                </Stack>
                            ) : (
                                <ResponsiveContainer>
                                    <BarChart data={employeeChartData} layout="vertical" margin={{ top: 8, right: 18, left: 16, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(143, 94, 54, 0.14)" />
                                        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                                        <YAxis dataKey="name" type="category" width={120} tickLine={false} axisLine={false} />
                                        <RechartsTooltip
                                            cursor={{ fill: "rgba(108, 138, 108, 0.08)" }}
                                            contentStyle={chartTooltipStyle}
                                            formatter={(value, name) => [`${Number(value).toLocaleString("id-ID")}`, name === "transaksi" ? "Transaksi" : "Member"]}
                                        />
                                        <Legend />
                                        <Bar dataKey="transaksi" name="Transaksi" fill="#C4705D" radius={[0, 6, 6, 0]} maxBarSize={24} />
                                        <Bar dataKey="member" name="Member" fill="#D1A45E" radius={[0, 6, 6, 0]} maxBarSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Paper sx={{ p: 3, borderRadius: 1 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="h6">Daftar Employee</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Edit employee, lihat detail performa, dan cek member yang pernah di-handle.
                        </Typography>
                    </Box>
                    <Chip label="Komisi sesuai master treatment" icon={<CommissionIcon />} variant="outlined" />
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Employee</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>No Telp</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Transaksi</TableCell>
                                <TableCell align="right">Member</TableCell>
                                <TableCell align="right">Omzet</TableCell>
                                <TableCell>Komisi</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                        <TableCell colSpan={9} align="center">Memuat employee...</TableCell>
                                </TableRow>
                            ) : filteredEmployees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center">Tidak ada employee yang cocok.</TableCell>
                                </TableRow>
                            ) : filteredEmployees.map((employee) => {
                                const stats = employeeStats.get(employee.id);

                                return (
                                    <TableRow key={employee.id} hover>
                                        <TableCell>
                                            <Stack direction="row" spacing={1.25} alignItems="center">
                                                <Avatar sx={{ width: 34, height: 34, borderRadius: 1, bgcolor: "primary.main" }}>
                                                    {employee.name.slice(0, 1).toUpperCase()}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={700}>{employee.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">Staff operasional salon</Typography>
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>{employee.role || "-"}</TableCell>
                                        <TableCell>{employee.phoneNumber || "-"}</TableCell>
                                        <TableCell><Chip label={employee.active === false ? "Nonaktif" : "Aktif"} color={employee.active === false ? "default" : "success"} size="small" /></TableCell>
                                        <TableCell align="right">{stats?.transactions || 0}</TableCell>
                                        <TableCell align="right">{stats?.members || 0}</TableCell>
                                        <TableCell align="right">{formatCurrency(stats?.revenue || 0)}</TableCell>
                                        <TableCell>{formatCurrency(stats?.commission || 0)}</TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Edit employee">
                                                <IconButton size="small" onClick={() => openEditDialog(employee)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Detail performa">
                                                <IconButton size="small" onClick={() => navigate(`/employees/${employee.id}`)}>
                                                    <DetailIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Hapus employee">
                                                <IconButton size="small" color="error" onClick={() => setEmployeeToDelete(employee)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={formOpen} onClose={closeEditDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingEmployee ? "Edit Employee" : "Tambah Employee"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <TextField label="Nama" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} fullWidth />
                        <TextField select label="Role" value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))} fullWidth>
                            <MenuItem value="Stylist">Stylist</MenuItem>
                            <MenuItem value="Kapster">Kapster</MenuItem>
                            <MenuItem value="Therapist">Therapist</MenuItem>
                            <MenuItem value="Kasir">Kasir</MenuItem>
                        </TextField>
                        <TextField label="No Telp" value={form.phoneNumber} onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))} fullWidth />
                        <TextField select label="Status" value={form.active ? "active" : "inactive"} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value === "active" }))} fullWidth>
                            <MenuItem value="active">Aktif</MenuItem>
                            <MenuItem value="inactive">Nonaktif</MenuItem>
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeEditDialog}>Batal</Button>
                    <Button variant="contained" onClick={handleSave}>Simpan</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(employeeToDelete)} onClose={() => setEmployeeToDelete(null)}>
                <DialogTitle>Hapus Employee</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Yakin ingin menghapus employee {employeeToDelete?.name || ""}? Backend bisa menolak kalau employee masih punya transaksi.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEmployeeToDelete(null)}>Batal</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>Hapus</Button>
                </DialogActions>
            </Dialog>
        </AppShell>
    );
}
