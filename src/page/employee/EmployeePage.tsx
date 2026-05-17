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
    Switch,
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
    CheckCircle as PaidIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    OpenInNew as DetailIcon,
    Paid as CommissionIcon,
    Payments as PayrollIcon,
    PeopleAlt as EmployeeIcon,
    Save as SaveIcon,
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
import type {
    CustomerTransaction,
    Employee,
    FinanceCategory,
    StaffPayroll,
    StaffPayrollBonusRequest,
    StaffPayrollDeductionRequest,
    StaffPayrollRequest
} from "../../api/types.ts";
import {employeeService} from "../../api/service/employeeService.ts";
import {transactionService} from "../../api/service/transactionService.ts";
import {financeService} from "../../api/service/financeService.ts";
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

const currentMonth = () => formatDateInput(new Date()).slice(0, 7);
const defaultPayrollCategory = {
    categoryId: "salary",
    name: "Gaji staff",
    kind: "FIXED" as const
};

function toPayrollDraft(row: StaffPayroll): StaffPayrollRequest {
    return {
        dailySalary: row.dailySalary || 0,
        workDays: row.workDays || 0,
        baseSalary: row.baseSalary || 0,
        quarterlyReward: row.quarterlyRewardAmount || row.quarterlyReward || 0,
        quarterlyRewardStartMonth: row.quarterlyRewardStartMonth || row.month,
        targetRevenue: row.targetRevenue || 0,
        targetBonusAmount: row.targetBonusAmount || 0,
        fridayBonusEnabled: row.fridayBonusEnabled || false,
        fridayBonusAmount: row.fridayBonusAmount || 0,
        payDate: row.payDate || null,
        paymentMethod: row.paymentMethod || "TRANSFER",
        expenseCategoryId: row.expenseCategoryId || defaultPayrollCategory.categoryId,
        expenseCategoryName: row.expenseCategoryName || defaultPayrollCategory.name,
        expenseKind: row.expenseKind || defaultPayrollCategory.kind,
        bonuses: row.bonuses?.map((item) => ({
            clientKey: `bonus-${item.id || item.title}-${item.date}`,
            date: item.date,
            title: item.title,
            amount: item.amount || 0,
            notes: item.notes || ""
        })) || [],
        deductions: row.deductions?.map((item) => ({
            clientKey: `deduction-${item.id || item.title}-${item.date}`,
            date: item.date,
            title: item.title,
            amount: item.amount || 0,
            notes: item.notes || ""
        })) || [],
        notes: row.notes || ""
    };
}

function applyPayrollExpenseCategory(
    categories: FinanceCategory[],
    categoryId: string,
    current: StaffPayrollRequest
): StaffPayrollRequest {
    const category = categories.find((item) => item.categoryId === categoryId);
    if (!category) return current;

    return {
        ...current,
        expenseCategoryId: category.categoryId,
        expenseCategoryName: category.name,
        expenseKind: category.kind
    };
}

const createBonus = (payDate?: string | null): StaffPayrollBonusRequest => ({
    date: payDate || formatDateInput(new Date()),
    title: "",
    amount: 0,
    notes: "",
    clientKey: `bonus-${Date.now()}-${Math.random()}`
});

const createDeduction = (payDate?: string | null): StaffPayrollDeductionRequest => ({
    date: payDate || formatDateInput(new Date()),
    title: "",
    amount: 0,
    notes: "",
    clientKey: `deduction-${Date.now()}-${Math.random()}`
});

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function payrollBreakdown(row: StaffPayroll) {
    const bonusTargetLabel = row.targetReached
        ? `Target ${formatCurrency(row.handledRevenue)} >= ${formatCurrency(row.targetRevenue)}`
        : `Target belum tercapai dari ${formatCurrency(row.targetRevenue)}`;
    const rewardLabel = row.quarterlyRewardEligible
        ? `Jadwal reward aktif sejak ${row.quarterlyRewardStartMonth}`
        : `Tidak masuk jadwal 3 bulanan dari ${row.quarterlyRewardStartMonth}`;
    const fridayLabel = row.fridayBonusEnabled
        ? `${row.fridayCount} Jumat x ${formatCurrency(row.fridayBonusAmount)}`
        : "Bonus Jumat nonaktif";

    return [
        { label: "Gaji pokok", formula: "Nominal tetap bulan ini", amount: row.baseSalary, sign: "plus" },
        { label: "Gaji harian", formula: `${row.workDays} hari x ${formatCurrency(row.dailySalary)}`, amount: row.dailySalaryTotal, sign: "plus" },
        { label: "Komisi otomatis", formula: `${row.handledTransactions} transaksi dari rule treatment/package`, amount: row.commission, sign: "plus" },
        { label: "Reward triwulan", formula: rewardLabel, amount: row.quarterlyReward, sign: "plus" },
        { label: "Bonus target", formula: bonusTargetLabel, amount: row.targetBonusPaid, sign: "plus" },
        { label: "Bonus Jumat", formula: fridayLabel, amount: row.fridayBonusTotal, sign: "plus" },
        { label: "Bonus lain-lain", formula: `${row.bonuses.length} item bonus`, amount: row.extraBonusTotal, sign: "plus" },
        { label: "Kasbon & potongan", formula: `${row.deductions.length} item potongan`, amount: row.deductionTotal, sign: "minus" }
    ];
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
    const [payrollMonth, setPayrollMonth] = useState(currentMonth());
    const [payrollRows, setPayrollRows] = useState<StaffPayroll[]>([]);
    const [payrollDrafts, setPayrollDrafts] = useState<Record<number, StaffPayrollRequest>>({});
    const [financeCategories, setFinanceCategories] = useState<FinanceCategory[]>([]);
    const [payrollLoading, setPayrollLoading] = useState(true);
    const [payrollDialogStaffId, setPayrollDialogStaffId] = useState<number | null>(null);

    useEffect(() => {
        Promise.all([
            employeeService.getAll(),
            transactionService.getAll(),
            financeService.getCategories()
        ])
            .then(([employeeRes, transactionRes, categoryRes]) => {
                setEmployees(employeeRes.success && Array.isArray(employeeRes.data) ? employeeRes.data : []);
                setTransactions(transactionRes.success && Array.isArray(transactionRes.data) ? transactionRes.data : []);
                setFinanceCategories(categoryRes.success && Array.isArray(categoryRes.data) ? categoryRes.data.filter((category) => category.active !== false) : []);
            })
            .catch((error) => {
                console.error(error);
                toast.error("Gagal memuat data employee.");
                setEmployees([]);
                setTransactions([]);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        setPayrollLoading(true);
        financeService.getPayroll(payrollMonth)
            .then((res) => {
                const rows = res.success && Array.isArray(res.data) ? res.data : [];
                setPayrollRows(rows);
                setPayrollDrafts(Object.fromEntries(rows.map((row) => [row.staff.id, toPayrollDraft(row)])));
            })
            .catch((error) => {
                console.error(error);
                toast.error("Gagal memuat payroll employee.");
                setPayrollRows([]);
                setPayrollDrafts({});
            })
            .finally(() => setPayrollLoading(false));
    }, [payrollMonth]);

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

    const activeEmployees = useMemo(() => filteredEmployees.filter((employee) => employee.active !== false), [filteredEmployees]);

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

    const payrollByStaff = useMemo(() => {
        return new Map(payrollRows.map((row) => [row.staff.id, row]));
    }, [payrollRows]);

    const filteredPayrollRows = useMemo(() => {
        const employeeIds = new Set(activeEmployees.map((employee) => employee.id));
        return payrollRows.filter((row) => employeeIds.has(row.staff.id));
    }, [activeEmployees, payrollRows]);

    const payrollExpenseCategories = useMemo(() => {
        const hasDefault = financeCategories.some((category) => category.categoryId === defaultPayrollCategory.categoryId);
        return hasDefault
            ? financeCategories
            : [{ id: -1, active: true, createdAt: "", description: "Default payroll", ...defaultPayrollCategory }, ...financeCategories];
    }, [financeCategories]);

    const totalBaseAndDailySalary = filteredPayrollRows.reduce((sum, row) => sum + row.baseSalary + row.dailySalaryTotal, 0);
    const totalPayroll = filteredPayrollRows.reduce((sum, row) => sum + row.totalPay, 0);
    const paidPayrollCount = filteredPayrollRows.filter((row) => row.paid).length;
    const unpaidPayrollCount = Math.max(0, filteredPayrollRows.length - paidPayrollCount);
    const paidPayrollTotal = filteredPayrollRows.filter((row) => row.paid).reduce((sum, row) => sum + row.totalPay, 0);

    const updatePayrollDraft = (staffId: number, patch: Partial<StaffPayrollRequest>) => {
        setPayrollDrafts((prev) => {
            const row = payrollByStaff.get(staffId);
            const current = prev[staffId] || (row ? toPayrollDraft(row) : {
                dailySalary: 0,
                workDays: 0,
                baseSalary: 0,
                quarterlyReward: 0,
                quarterlyRewardStartMonth: payrollMonth,
                targetRevenue: 10_000_000,
                targetBonusAmount: 500_000,
                fridayBonusEnabled: false,
                fridayBonusAmount: 10_000,
                payDate: null,
                paymentMethod: "TRANSFER",
                expenseCategoryId: defaultPayrollCategory.categoryId,
                expenseCategoryName: defaultPayrollCategory.name,
                expenseKind: defaultPayrollCategory.kind,
                bonuses: [],
                deductions: [],
                notes: ""
            });

            return {
                ...prev,
                [staffId]: {
                    ...current,
                    ...patch
                }
            };
        });
    };

    const openPayrollDialog = (row: StaffPayroll) => {
        setPayrollDrafts((prev) => ({ ...prev, [row.staff.id]: prev[row.staff.id] || toPayrollDraft(row) }));
        setPayrollDialogStaffId(row.staff.id);
    };

    const closePayrollDialog = () => setPayrollDialogStaffId(null);

    const payrollDialogRow = payrollDialogStaffId ? payrollByStaff.get(payrollDialogStaffId) || null : null;
    const payrollDialogDraft = payrollDialogStaffId ? payrollDrafts[payrollDialogStaffId] : undefined;

    const updatePayrollBonus = (staffId: number, index: number, patch: Partial<StaffPayrollBonusRequest>) => {
        const current = payrollDrafts[staffId] || (payrollByStaff.get(staffId) ? toPayrollDraft(payrollByStaff.get(staffId) as StaffPayroll) : null);
        if (!current) return;
        updatePayrollDraft(staffId, {
            bonuses: current.bonuses.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
        });
    };

    const addPayrollBonus = (staffId: number) => {
        const current = payrollDrafts[staffId] || (payrollByStaff.get(staffId) ? toPayrollDraft(payrollByStaff.get(staffId) as StaffPayroll) : null);
        if (!current) return;
        updatePayrollDraft(staffId, {
            bonuses: [...current.bonuses, createBonus(current.payDate)]
        });
    };

    const removePayrollBonus = (staffId: number, index: number) => {
        const current = payrollDrafts[staffId] || (payrollByStaff.get(staffId) ? toPayrollDraft(payrollByStaff.get(staffId) as StaffPayroll) : null);
        if (!current) return;
        updatePayrollDraft(staffId, {
            bonuses: current.bonuses.filter((_, itemIndex) => itemIndex !== index)
        });
    };

    const updatePayrollDeduction = (staffId: number, index: number, patch: Partial<StaffPayrollDeductionRequest>) => {
        const current = payrollDrafts[staffId] || (payrollByStaff.get(staffId) ? toPayrollDraft(payrollByStaff.get(staffId) as StaffPayroll) : null);
        if (!current) return;
        updatePayrollDraft(staffId, {
            deductions: current.deductions.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
        });
    };

    const addPayrollDeduction = (staffId: number) => {
        const current = payrollDrafts[staffId] || (payrollByStaff.get(staffId) ? toPayrollDraft(payrollByStaff.get(staffId) as StaffPayroll) : null);
        if (!current) return;
        updatePayrollDraft(staffId, {
            deductions: [...current.deductions, createDeduction(current.payDate)]
        });
    };

    const removePayrollDeduction = (staffId: number, index: number) => {
        const current = payrollDrafts[staffId] || (payrollByStaff.get(staffId) ? toPayrollDraft(payrollByStaff.get(staffId) as StaffPayroll) : null);
        if (!current) return;
        updatePayrollDraft(staffId, {
            deductions: current.deductions.filter((_, itemIndex) => itemIndex !== index)
        });
    };

    const savePayrollRow = (staffId: number) => {
        const draft = payrollDrafts[staffId];
        if (!draft) return;

        const promise = financeService.saveStaffPayroll(staffId, payrollMonth, draft).then((res) => {
            if (!res.success || !res.data) {
                throw new Error(res.message || "Gagal menyimpan payroll.");
            }

            setPayrollRows((prev) => {
                const exists = prev.some((row) => row.staff.id === staffId);
                return exists
                    ? prev.map((row) => row.staff.id === staffId ? res.data as StaffPayroll : row)
                    : [...prev, res.data as StaffPayroll];
            });
            setPayrollDrafts((prev) => ({ ...prev, [staffId]: toPayrollDraft(res.data as StaffPayroll) }));
            return res;
        });

        toast.promise(promise, {
            loading: "Menyimpan payroll...",
            success: "Payroll berhasil disimpan.",
            error: (error: unknown) => getErrorMessage(error, "Gagal menyimpan payroll.")
        }).then(() => {});
    };

    const payPayrollRow = (staffId: number) => {
        const draft = payrollDrafts[staffId];
        if (!draft) return;

        const promise = financeService.saveStaffPayroll(staffId, payrollMonth, draft)
            .then((saveRes) => {
                if (!saveRes.success || !saveRes.data) {
                    throw new Error(saveRes.message || "Gagal menyimpan payroll sebelum pembayaran.");
                }
                return financeService.payStaffPayroll(staffId, payrollMonth);
            })
            .then((payRes) => {
                if (!payRes.success || !payRes.data) {
                    throw new Error(payRes.message || "Gagal memberikan gaji.");
                }

                setPayrollRows((prev) => prev.map((row) => row.staff.id === staffId ? payRes.data as StaffPayroll : row));
                setPayrollDrafts((prev) => ({ ...prev, [staffId]: toPayrollDraft(payRes.data as StaffPayroll) }));
                return payRes;
            });

        toast.promise(promise, {
            loading: "Memproses gaji...",
            success: "Gaji berhasil diberikan dan masuk ke finance.",
            error: (error: unknown) => getErrorMessage(error, "Gagal memberikan gaji.")
        }).then(() => {});
    };

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
                <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Total Employee</Typography>
                        <Typography variant="h5" fontWeight={800}>{filteredEmployees.length.toLocaleString("id-ID")}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Transaksi Ditangani</Typography>
                        <Typography variant="h5" fontWeight={800}>{totalHandledTransactions.toLocaleString("id-ID")}x</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Omzet Ditangani</Typography>
                        <Typography variant="h5" fontWeight={800}>{formatCurrency(totalRevenue)}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Total Komisi</Typography>
                        <Typography variant="h5" fontWeight={800}>{formatCurrency(totalCommission)}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Gaji Pokok & Harian</Typography>
                        <Typography variant="h5" fontWeight={800}>{formatCurrency(totalBaseAndDailySalary)}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Total Payroll</Typography>
                        <Typography variant="h5" fontWeight={800}>{formatCurrency(totalPayroll)}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" sx={{ mb: 2 }}>
                            <Box>
                                <Typography variant="h6">Omzet & Komisi per Stylist</Typography>
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
                                            formatter={(value, name) => [formatCurrency(Number(value)), String(name).toLowerCase() === "omzet" ? "Omzet" : "Komisi"]}
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
                                            formatter={(value, name) => [`${Number(value).toLocaleString("id-ID")}`, String(name).toLowerCase() === "transaksi" ? "Transaksi" : "Member"]}
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

            <Paper sx={{ p: 3, borderRadius: 1, mb: 3 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="h6">Payroll Bulanan</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Ringkasan gaji staff aktif. Detail komponen, kasbon, dan potongan dibuka dari tombol Atur.
                        </Typography>
                    </Box>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ sm: "center" }}>
                        <Chip icon={<PayrollIcon />} label={`Payroll: ${formatCurrency(totalPayroll)}`} color="secondary" variant="outlined" />
                        <Chip icon={<PaidIcon />} label={`Terbayar: ${formatCurrency(paidPayrollTotal)}`} color={paidPayrollCount > 0 ? "success" : "default"} variant="outlined" />
                        <Chip label={`${unpaidPayrollCount} belum digaji`} color={unpaidPayrollCount > 0 ? "warning" : "success"} variant="outlined" />
                        <TextField
                            size="small"
                            type="month"
                            label="Bulan"
                            InputLabelProps={{ shrink: true }}
                            value={payrollMonth}
                            onChange={(event) => setPayrollMonth(event.target.value || currentMonth())}
                            sx={{ width: 160 }}
                        />
                    </Stack>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Staff</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Omzet</TableCell>
                                <TableCell align="right">Komisi</TableCell>
                                <TableCell align="right">Bonus</TableCell>
                                <TableCell align="right">Potongan</TableCell>
                                <TableCell align="right">Gaji Akhir</TableCell>
                                <TableCell>Gajian</TableCell>
                                <TableCell align="right">Aksi</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {payrollLoading ? (
                                <TableRow><TableCell colSpan={9} align="center">Memuat payroll...</TableCell></TableRow>
                            ) : filteredPayrollRows.length === 0 ? (
                                <TableRow><TableCell colSpan={9} align="center">Belum ada payroll untuk staff aktif di filter ini.</TableCell></TableRow>
                            ) : filteredPayrollRows.map((row) => (
                                <TableRow key={row.staff.id} hover sx={{ bgcolor: row.paid ? "rgba(108, 138, 108, 0.06)" : "inherit" }}>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={800}>{row.staff.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{row.staff.role || "-"}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip size="small" icon={row.paid ? <PaidIcon /> : undefined} label={row.paid ? "Sudah digaji" : "Belum digaji"} color={row.paid ? "success" : "warning"} />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight={700}>{formatCurrency(row.handledRevenue)}</Typography>
                                        <Typography variant="caption" color="text.secondary">{row.handledTransactions} transaksi</Typography>
                                    </TableCell>
                                    <TableCell align="right">{formatCurrency(row.commission)}</TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2">{formatCurrency(row.quarterlyReward + row.targetBonusPaid + row.fridayBonusTotal + row.extraBonusTotal)}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Reward {row.quarterlyRewardEligible ? "masuk" : "tidak"}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: row.deductionTotal > 0 ? "error.main" : "text.primary" }}>
                                        {formatCurrency(row.deductionTotal || 0)}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography variant="body2" fontWeight={900}>{formatCurrency(row.totalPay)}</Typography>
                                        <Typography variant="caption" color="text.secondary">Gross {formatCurrency(row.grossPay)}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{row.payDate}</Typography>
                                        <Typography variant="caption" color="text.secondary">{row.paymentMethod}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                                            <Button size="small" variant="outlined" onClick={() => openPayrollDialog(row)}>Atur</Button>
                                            <Button size="small" variant={row.paid ? "outlined" : "contained"} color={row.paid ? "success" : "primary"} startIcon={<PaidIcon />} disabled={row.paid} onClick={() => payPayrollRow(row.staff.id)} sx={{ whiteSpace: "nowrap" }}>
                                                {row.paid ? "Sudah" : "Berikan gaji"}
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={Boolean(payrollDialogRow && payrollDialogDraft)} onClose={closePayrollDialog} maxWidth="lg" fullWidth>
                <DialogTitle>Atur Payroll {payrollDialogRow?.staff.name || ""}</DialogTitle>
                <DialogContent>
                    {payrollDialogRow && payrollDialogDraft && (
                        <Stack spacing={2.5} sx={{ pt: 1 }}>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Gross</Typography>
                                        <Typography variant="h6" fontWeight={900}>{formatCurrency(payrollDialogRow.grossPay)}</Typography>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Potongan</Typography>
                                        <Typography variant="h6" fontWeight={900} color={payrollDialogRow.deductionTotal > 0 ? "error.main" : "text.primary"}>{formatCurrency(payrollDialogRow.deductionTotal)}</Typography>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Gaji Akhir</Typography>
                                        <Typography variant="h6" fontWeight={900}>{formatCurrency(payrollDialogRow.totalPay)}</Typography>
                                    </Paper>
                                </Grid>
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                        <Typography variant="caption" color="text.secondary">Komisi Auto</Typography>
                                        <Typography variant="h6" fontWeight={900}>{formatCurrency(payrollDialogRow.commission)}</Typography>
                                    </Paper>
                                </Grid>
                            </Grid>

                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={900}>Slip Gaji</Typography>
                                        <Typography variant="body2" color="text.secondary">Ringkasan perhitungan tanpa hitung manual.</Typography>
                                    </Box>
                                    <Chip color="secondary" label={`Gaji akhir ${formatCurrency(payrollDialogRow.totalPay)}`} />
                                </Stack>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, md: 7 }}>
                                        <Stack spacing={1}>
                                            {payrollBreakdown(payrollDialogRow).filter((item) => item.sign === "plus").map((item) => (
                                                <Stack key={item.label} direction="row" spacing={1.5} justifyContent="space-between" alignItems="flex-start">
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={700}>{item.label}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{item.formula}</Typography>
                                                    </Box>
                                                    <Typography variant="body2" fontWeight={800}>{formatCurrency(item.amount)}</Typography>
                                                </Stack>
                                            ))}
                                            {payrollDialogRow.bonuses.map((item) => (
                                                <Stack key={`bonus-${item.id || item.title}-${item.date}`} direction="row" spacing={1.5} justifyContent="space-between" sx={{ pl: 2 }}>
                                                    <Box>
                                                        <Typography variant="body2">{item.title}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{item.notes || item.date}</Typography>
                                                    </Box>
                                                    <Typography variant="body2">{formatCurrency(item.amount)}</Typography>
                                                </Stack>
                                            ))}
                                        </Stack>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 5 }}>
                                        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, bgcolor: "rgba(196, 112, 93, 0.06)" }}>
                                            <Typography variant="body2" fontWeight={900} sx={{ mb: 1 }}>Potongan</Typography>
                                            {payrollDialogRow.deductions.length === 0 ? (
                                                <Typography variant="body2" color="text.secondary">Tidak ada potongan.</Typography>
                                            ) : payrollDialogRow.deductions.map((item) => (
                                                <Stack key={`deduction-${item.id || item.title}-${item.date}`} direction="row" spacing={1.5} justifyContent="space-between" sx={{ mb: 0.75 }}>
                                                    <Box>
                                                        <Typography variant="body2">{item.title}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{item.notes || item.date}</Typography>
                                                    </Box>
                                                    <Typography variant="body2" color="error.main">-{formatCurrency(item.amount)}</Typography>
                                                </Stack>
                                            ))}
                                            <Divider sx={{ my: 1 }} />
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="body2" fontWeight={900}>Total potongan</Typography>
                                                <Typography variant="body2" fontWeight={900} color={payrollDialogRow.deductionTotal > 0 ? "error.main" : "text.primary"}>-{formatCurrency(payrollDialogRow.deductionTotal)}</Typography>
                                            </Stack>
                                        </Paper>
                                        <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="body2">Gross</Typography>
                                                <Typography variant="body2" fontWeight={800}>{formatCurrency(payrollDialogRow.grossPay)}</Typography>
                                            </Stack>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="body2">Potongan</Typography>
                                                <Typography variant="body2" fontWeight={800} color="error.main">-{formatCurrency(payrollDialogRow.deductionTotal)}</Typography>
                                            </Stack>
                                            <Divider />
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="subtitle2" fontWeight={900}>Diterima staff</Typography>
                                                <Typography variant="subtitle2" fontWeight={900}>{formatCurrency(payrollDialogRow.totalPay)}</Typography>
                                            </Stack>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 2 }}>Komponen Gaji</Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth size="small" type="number" label="Gaji pokok" value={payrollDialogDraft.baseSalary} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDraft(payrollDialogRow.staff.id, { baseSalary: Number(event.target.value) })} /></Grid>
                                    <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth size="small" type="number" label="Gaji harian" value={payrollDialogDraft.dailySalary} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDraft(payrollDialogRow.staff.id, { dailySalary: Number(event.target.value) })} /></Grid>
                                    <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="number" label="Hari kerja" value={payrollDialogDraft.workDays} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDraft(payrollDialogRow.staff.id, { workDays: Number(event.target.value) })} /></Grid>
                                    <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="date" label="Tanggal gajian" InputLabelProps={{ shrink: true }} value={payrollDialogDraft.payDate || payrollDialogRow.payDate} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDraft(payrollDialogRow.staff.id, { payDate: event.target.value || null })} /></Grid>
                                    <Grid size={{ xs: 12, md: 2 }}>
                                        <TextField fullWidth select size="small" label="Metode" value={payrollDialogDraft.paymentMethod} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDraft(payrollDialogRow.staff.id, { paymentMethod: event.target.value as StaffPayrollRequest["paymentMethod"] })}>
                                            <MenuItem value="CASH">CASH</MenuItem>
                                            <MenuItem value="TRANSFER">TRANSFER</MenuItem>
                                            <MenuItem value="QRIS">QRIS</MenuItem>
                                        </TextField>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <TextField
                                            fullWidth
                                            select
                                            size="small"
                                            label="Kategori expense gaji"
                                            value={payrollDialogDraft.expenseCategoryId || defaultPayrollCategory.categoryId}
                                            disabled={payrollDialogRow.paid}
                                            onChange={(event) => updatePayrollDraft(
                                                payrollDialogRow.staff.id,
                                                applyPayrollExpenseCategory(payrollExpenseCategories, event.target.value, payrollDialogDraft)
                                            )}
                                        >
                                            {payrollExpenseCategories.map((category) => (
                                                <MenuItem key={category.id} value={category.categoryId}>{category.name} ({category.kind})</MenuItem>
                                            ))}
                                        </TextField>
                                    </Grid>
                                </Grid>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 2 }}>Bonus & Target</Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth size="small" type="number" label="Reward/3 bulan" value={payrollDialogDraft.quarterlyReward} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDraft(payrollDialogRow.staff.id, { quarterlyReward: Number(event.target.value) })} /></Grid>
                                    <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth size="small" type="month" label="Mulai reward" InputLabelProps={{ shrink: true }} value={payrollDialogDraft.quarterlyRewardStartMonth || payrollDialogRow.quarterlyRewardStartMonth || payrollMonth} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDraft(payrollDialogRow.staff.id, { quarterlyRewardStartMonth: event.target.value || payrollMonth })} /></Grid>
                                    <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth size="small" type="number" label="Target omzet" value={payrollDialogDraft.targetRevenue} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDraft(payrollDialogRow.staff.id, { targetRevenue: Number(event.target.value) })} /></Grid>
                                    <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth size="small" type="number" label="Bonus target" value={payrollDialogDraft.targetBonusAmount} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDraft(payrollDialogRow.staff.id, { targetBonusAmount: Number(event.target.value) })} /></Grid>
                                    <Grid size={{ xs: 12, md: 3 }}><Stack direction="row" spacing={1} alignItems="center"><Switch checked={payrollDialogDraft.fridayBonusEnabled} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDraft(payrollDialogRow.staff.id, { fridayBonusEnabled: event.target.checked })} /><Typography variant="body2">Bonus Jumat</Typography></Stack></Grid>
                                    <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth size="small" type="number" label="Nominal Jumat" value={payrollDialogDraft.fridayBonusAmount} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDraft(payrollDialogRow.staff.id, { fridayBonusAmount: Number(event.target.value) })} /></Grid>
                                    <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Catatan payroll" value={payrollDialogDraft.notes} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDraft(payrollDialogRow.staff.id, { notes: event.target.value })} /></Grid>
                                </Grid>
                                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                                    <Chip size="small" label={payrollDialogRow.quarterlyRewardEligible ? `Reward masuk ${formatCurrency(payrollDialogRow.quarterlyReward)}` : "Reward tidak masuk bulan ini"} color={payrollDialogRow.quarterlyRewardEligible ? "success" : "default"} />
                                    <Chip size="small" label={payrollDialogRow.targetReached ? `Target tercapai, bonus ${formatCurrency(payrollDialogRow.targetBonusPaid)}` : "Target belum tercapai"} color={payrollDialogRow.targetReached ? "success" : "default"} />
                                    <Chip size="small" label={`${payrollDialogRow.fridayCount} Jumat`} variant="outlined" />
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={900}>Bonus Lain-lain</Typography>
                                        <Typography variant="body2" color="text.secondary">Tambahan gaji manual di luar komisi, reward, target, dan Jumat.</Typography>
                                    </Box>
                                    <Button variant="outlined" startIcon={<AddIcon />} disabled={payrollDialogRow.paid} onClick={() => addPayrollBonus(payrollDialogRow.staff.id)}>Tambah Bonus</Button>
                                </Stack>
                                <Stack spacing={1.25}>
                                    {payrollDialogDraft.bonuses.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary">Belum ada bonus lain-lain.</Typography>
                                    ) : payrollDialogDraft.bonuses.map((item, index) => (
                                        <Grid container spacing={1.25} key={item.clientKey || `bonus-${index}`}>
                                            <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="date" label="Tanggal" InputLabelProps={{ shrink: true }} value={item.date || payrollDialogDraft.payDate || payrollDialogRow.payDate} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollBonus(payrollDialogRow.staff.id, index, { date: event.target.value || null })} /></Grid>
                                            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth size="small" label="Nama bonus" value={item.title} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollBonus(payrollDialogRow.staff.id, index, { title: event.target.value })} /></Grid>
                                            <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="number" label="Nominal" value={item.amount} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollBonus(payrollDialogRow.staff.id, index, { amount: Number(event.target.value) })} /></Grid>
                                            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Catatan" value={item.notes} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollBonus(payrollDialogRow.staff.id, index, { notes: event.target.value })} /></Grid>
                                            <Grid size={{ xs: 12, md: 1 }}><Button fullWidth color="error" disabled={payrollDialogRow.paid} onClick={() => removePayrollBonus(payrollDialogRow.staff.id, index)}>Hapus</Button></Grid>
                                        </Grid>
                                    ))}
                                </Stack>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={900}>Kasbon & Potongan</Typography>
                                        <Typography variant="body2" color="text.secondary">Bisa lebih dari satu item, otomatis mengurangi gaji akhir.</Typography>
                                    </Box>
                                    <Button variant="outlined" startIcon={<AddIcon />} disabled={payrollDialogRow.paid} onClick={() => addPayrollDeduction(payrollDialogRow.staff.id)}>Tambah Potongan</Button>
                                </Stack>
                                <Stack spacing={1.25}>
                                    {payrollDialogDraft.deductions.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary">Belum ada kasbon atau potongan.</Typography>
                                    ) : payrollDialogDraft.deductions.map((item, index) => (
                                        <Grid container spacing={1.25} key={item.clientKey || `deduction-${index}`}>
                                            <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="date" label="Tanggal" InputLabelProps={{ shrink: true }} value={item.date || payrollDialogDraft.payDate || payrollDialogRow.payDate} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDeduction(payrollDialogRow.staff.id, index, { date: event.target.value || null })} /></Grid>
                                            <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth size="small" label="Nama potongan" value={item.title} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDeduction(payrollDialogRow.staff.id, index, { title: event.target.value })} /></Grid>
                                            <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="number" label="Nominal" value={item.amount} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDeduction(payrollDialogRow.staff.id, index, { amount: Number(event.target.value) })} /></Grid>
                                            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Catatan" value={item.notes} disabled={payrollDialogRow.paid} onChange={(event) => updatePayrollDeduction(payrollDialogRow.staff.id, index, { notes: event.target.value })} /></Grid>
                                            <Grid size={{ xs: 12, md: 1 }}><Button fullWidth color="error" disabled={payrollDialogRow.paid} onClick={() => removePayrollDeduction(payrollDialogRow.staff.id, index)}>Hapus</Button></Grid>
                                        </Grid>
                                    ))}
                                </Stack>
                            </Paper>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closePayrollDialog}>Tutup</Button>
                    {payrollDialogRow && (
                        <>
                            <Button variant="outlined" startIcon={<SaveIcon />} disabled={payrollDialogRow.paid} onClick={() => savePayrollRow(payrollDialogRow.staff.id)}>Simpan</Button>
                            <Button variant="contained" startIcon={<PaidIcon />} disabled={payrollDialogRow.paid} onClick={() => payPayrollRow(payrollDialogRow.staff.id)}>
                                Berikan gaji
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

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
