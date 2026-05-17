import {useEffect, useMemo, useState} from "react";
import {
    Box,
    Button,
    Chip,
    Divider,
    Grid,
    MenuItem,
    Paper,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Typography
} from "@mui/material";
import {
    AccountBalanceWallet as WalletIcon,
    Add as AddIcon,
    Paid as PaidIcon,
    ReceiptLong as ReceiptIcon,
    Savings as SavingsIcon,
    TrendingUp as TrendIcon
} from "@mui/icons-material";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    XAxis,
    YAxis
} from "recharts";
import toast, {Toaster} from "react-hot-toast";
import AppShell from "../../components/AppShell.tsx";
import type {
    CashReconciliation,
    CashReconciliationRequest,
    CustomerTransaction,
    CustomerTransactionItem,
    ExpenseKind,
    FinanceCategory,
    FinanceCategoryRequest,
    FinanceExpense,
    FinanceExpenseRequest,
    MonthlyBudget,
    MonthlyBudgetRequest,
    PaymentMethod,
    RecurringExpense,
    RecurringExpenseFrequency,
    RecurringExpenseRequest
} from "../../api/types.ts";
import {transactionService} from "../../api/service/transactionService.ts";
import {financeService} from "../../api/service/financeService.ts";
import {formatCurrency, formatDateInput, formatDateTime, getItemName, parseDate} from "../employee/employeeInsights.ts";
import {buildExpenseSummary, expenseCategories, getExpenseStatus} from "./financeExpenseFoundation.ts";

type ChartPoint = {
    name: string;
    gross: number;
    net: number;
    commission: number;
    voucher: number;
    transactions: number;
};

type PaymentPoint = {
    name: PaymentMethod;
    value: number;
    transactions: number;
};

type StaffPoint = {
    id: number;
    name: string;
    gross: number;
    commission: number;
    transactions: number;
};

type ExpenseCategorySummary = {
    id: string;
    backendId: number;
    categoryId: string;
    name: string;
    kind: ExpenseKind;
    budget: number;
    actual: number;
    description: string;
};

const chartTooltipStyle = {
    borderRadius: 8,
    border: "1px solid rgba(143, 94, 54, 0.18)",
    boxShadow: "0 12px 28px rgba(31, 24, 18, 0.12)"
};

const todayInput = () => formatDateInput(new Date());
const currentMonth = () => todayInput().slice(0, 7);

const fallbackFinanceCategories: FinanceCategory[] = expenseCategories.map((category, index) => ({
    id: index + 1,
    categoryId: category.id,
    name: category.name,
    kind: category.kind,
    description: category.description,
    active: true,
    createdAt: ""
}));

const defaultCategory = fallbackFinanceCategories[0];

const emptyCategoryForm = (): FinanceCategoryRequest => ({
    categoryId: "",
    name: "",
    kind: "VARIABLE",
    description: "",
    active: true
});

const emptyExpenseForm = (category: FinanceCategory = defaultCategory): FinanceExpenseRequest => ({
    date: todayInput(),
    categoryId: category.categoryId,
    categoryName: category.name,
    kind: category.kind,
    amount: 0,
    paymentMethod: "CASH",
    vendor: "",
    notes: "",
    receiptUrl: ""
});

const emptyBudgetForm = (category: FinanceCategory = defaultCategory): MonthlyBudgetRequest => ({
    month: currentMonth(),
    categoryId: category.categoryId,
    categoryName: category.name,
    kind: category.kind,
    amount: 0
});

const emptyRecurringForm = (category: FinanceCategory = defaultCategory): RecurringExpenseRequest => ({
    name: "",
    categoryId: category.categoryId,
    categoryName: category.name,
    kind: category.kind,
    amount: 0,
    paymentMethod: "CASH",
    frequency: "MONTHLY",
    startDate: todayInput(),
    endDate: null,
    nextDueDate: todayInput(),
    active: true,
    notes: ""
});

const emptyReconciliationForm = (): CashReconciliationRequest => ({
    date: todayInput(),
    actualCash: 0,
    cashierName: "",
    notes: ""
});

function calculateItemCommission(item: CustomerTransactionItem) {
    if (item.treatmentType === "Single" && item.treatment) {
        const value = item.treatment.staffCommissionValue || 0;
        return item.treatment.staffCommissionType === "FIXED"
            ? value
            : (item.price || 0) * value / 100;
    }

    if (item.treatmentType === "Package" && item.treatmentPackage?.treatments?.length) {
        const splitPrice = (item.price || 0) / item.treatmentPackage.treatments.length;
        return item.treatmentPackage.treatments.reduce((sum, treatment) => {
            const value = treatment.staffCommissionValue || 0;
            return sum + (treatment.staffCommissionType === "FIXED" ? value : splitPrice * value / 100);
        }, 0);
    }

    return 0;
}

function getTransactionCommission(transaction: CustomerTransaction) {
    return (transaction.items || []).reduce((sum, item) => sum + calculateItemCommission(item), 0);
}

function filterByDate<T extends { date: string }>(items: T[], rangePreset: string, startDate: string, endDate: string) {
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
    } else if (rangePreset === "month") {
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
        rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (rangePreset === "custom" && startDate && endDate) {
        rangeStart = new Date(startDate + "T00:00:00");
        rangeEnd = new Date(endDate + "T23:59:59.999");
    }

    if (!rangeStart && !rangeEnd) return items;

    return items.filter((item) => {
        const parsed = parseDate(item.date);
        if (!parsed) return false;
        if (rangeStart && parsed < rangeStart) return false;
        if (rangeEnd && parsed >= rangeEnd) return false;
        return true;
    });
}

function buildTrend(transactions: CustomerTransaction[]): ChartPoint[] {
    const buckets = new Map<string, ChartPoint>();

    transactions.forEach((transaction) => {
        const parsed = parseDate(transaction.date);
        if (!parsed) return;

        const key = formatDateInput(parsed);
        const name = parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        const gross = transaction.actualPrice || 0;
        const voucher = transaction.voucherDiscountAmount || 0;
        const commission = getTransactionCommission(transaction);
        const current = buckets.get(key) || { name, gross: 0, net: 0, commission: 0, voucher: 0, transactions: 0 };

        buckets.set(key, {
            name,
            gross: current.gross + gross,
            net: current.net + Math.max(0, gross - commission),
            commission: current.commission + commission,
            voucher: current.voucher + voucher,
            transactions: current.transactions + 1
        });
    });

    return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => value);
}

function findCategory(categories: FinanceCategory[], categoryId: string) {
    return categories.find((item) => item.categoryId === categoryId) || categories[0] || defaultCategory;
}

function applyCategoryToExpense(categories: FinanceCategory[], categoryId: string, current: FinanceExpenseRequest): FinanceExpenseRequest {
    const category = findCategory(categories, categoryId);
    return {
        ...current,
        categoryId: category.categoryId,
        categoryName: category.name,
        kind: category.kind
    };
}

function applyCategoryToBudget(categories: FinanceCategory[], categoryId: string, current: MonthlyBudgetRequest): MonthlyBudgetRequest {
    const category = findCategory(categories, categoryId);
    return {
        ...current,
        categoryId: category.categoryId,
        categoryName: category.name,
        kind: category.kind
    };
}

function applyCategoryToRecurring(categories: FinanceCategory[], categoryId: string, current: RecurringExpenseRequest): RecurringExpenseRequest {
    const category = findCategory(categories, categoryId);
    return {
        ...current,
        categoryId: category.categoryId,
        categoryName: category.name,
        kind: category.kind
    };
}

async function fetchFinanceData(month: string) {
    const [categoryRes, expenseRes, budgetRes, recurringRes, reconciliationRes] = await Promise.all([
        financeService.getCategories(),
        financeService.getExpenses(),
        financeService.getBudgets(month),
        financeService.getRecurringExpenses(),
        financeService.getCashReconciliations()
    ]);

    return {
        categories: categoryRes.success && Array.isArray(categoryRes.data) ? categoryRes.data : fallbackFinanceCategories,
        expenses: expenseRes.success && Array.isArray(expenseRes.data) ? expenseRes.data : [],
        budgets: budgetRes.success && Array.isArray(budgetRes.data) ? budgetRes.data : [],
        recurringExpenses: recurringRes.success && Array.isArray(recurringRes.data) ? recurringRes.data : [],
        cashReconciliations: reconciliationRes.success && Array.isArray(reconciliationRes.data) ? reconciliationRes.data : []
    };
}

export default function FinancePage() {
    const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
    const [financeCategories, setFinanceCategories] = useState<FinanceCategory[]>(fallbackFinanceCategories);
    const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
    const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [cashReconciliations, setCashReconciliations] = useState<CashReconciliation[]>([]);
    const [loading, setLoading] = useState(true);
    const [rangePreset, setRangePreset] = useState("month");
    const [startDate, setStartDate] = useState(todayInput());
    const [endDate, setEndDate] = useState(todayInput());
    const [paymentFilter, setPaymentFilter] = useState<"all" | PaymentMethod>("all");
    const [tab, setTab] = useState(0);
    const [budgetMonth, setBudgetMonth] = useState(currentMonth());
    const [categoryForm, setCategoryForm] = useState<FinanceCategoryRequest>(emptyCategoryForm);
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [expenseForm, setExpenseForm] = useState<FinanceExpenseRequest>(emptyExpenseForm);
    const [budgetForm, setBudgetForm] = useState<MonthlyBudgetRequest>(emptyBudgetForm);
    const [recurringForm, setRecurringForm] = useState<RecurringExpenseRequest>(emptyRecurringForm);
    const [reconciliationForm, setReconciliationForm] = useState<CashReconciliationRequest>(emptyReconciliationForm);
    const [expectedCash, setExpectedCash] = useState(0);

    const loadFinanceData = async () => {
        const data = await fetchFinanceData(budgetMonth);
        setFinanceCategories(data.categories.length > 0 ? data.categories : fallbackFinanceCategories);
        setExpenses(data.expenses);
        setBudgets(data.budgets);
        setRecurringExpenses(data.recurringExpenses);
        setCashReconciliations(data.cashReconciliations);
    };

    useEffect(() => {
        Promise.all([
            transactionService.getAll(),
            fetchFinanceData(currentMonth())
        ])
            .then(([transactionRes, financeData]) => {
                setTransactions(transactionRes.success && Array.isArray(transactionRes.data) ? transactionRes.data : []);
                setFinanceCategories(financeData.categories.length > 0 ? financeData.categories : fallbackFinanceCategories);
                setExpenses(financeData.expenses);
                setBudgets(financeData.budgets);
                setRecurringExpenses(financeData.recurringExpenses);
                setCashReconciliations(financeData.cashReconciliations);
            })
            .catch((error) => {
                console.error(error);
                toast.error("Gagal memuat data keuangan.");
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        financeService.getBudgets(budgetMonth)
            .then((res) => setBudgets(res.success && Array.isArray(res.data) ? res.data : []))
            .catch(() => toast.error("Gagal memuat budget bulanan."));
    }, [budgetMonth]);

    useEffect(() => {
        financeService.getExpectedCash(reconciliationForm.date)
            .then((res) => setExpectedCash(res.success && typeof res.data === "number" ? res.data : 0))
            .catch(() => setExpectedCash(0));
    }, [reconciliationForm.date, expenses, transactions]);

    const filteredTransactions = useMemo(() => {
        const byDate = filterByDate(transactions, rangePreset, startDate, endDate);
        return byDate
            .filter((transaction) => paymentFilter === "all" || transaction.paymentMethod === paymentFilter)
            .sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0));
    }, [transactions, rangePreset, startDate, endDate, paymentFilter]);

    const filteredExpenses = useMemo(() => {
        return filterByDate(expenses, rangePreset, startDate, endDate)
            .filter((expense) => paymentFilter === "all" || expense.paymentMethod === paymentFilter)
            .sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0));
    }, [expenses, rangePreset, startDate, endDate, paymentFilter]);

    const filteredReconciliations = useMemo(() => {
        return filterByDate(cashReconciliations, rangePreset, startDate, endDate)
            .sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0));
    }, [cashReconciliations, rangePreset, startDate, endDate]);

    const summary = useMemo(() => {
        return filteredTransactions.reduce((acc, transaction) => {
            const gross = transaction.actualPrice || 0;
            const voucher = transaction.voucherDiscountAmount || 0;
            const commission = getTransactionCommission(transaction);

            return {
                gross: acc.gross + gross,
                voucher: acc.voucher + voucher,
                commission: acc.commission + commission,
                net: acc.net + Math.max(0, gross - commission),
                transactions: acc.transactions + 1,
                customers: acc.customers.add(transaction.customer?.id || transaction.customer?.name || transaction.id)
            };
        }, {
            gross: 0,
            voucher: 0,
            commission: 0,
            net: 0,
            transactions: 0,
            customers: new Set<string | number>()
        });
    }, [filteredTransactions]);

    const paymentData = useMemo<PaymentPoint[]>(() => {
        const map = new Map<PaymentMethod, PaymentPoint>();
        filteredTransactions.forEach((transaction) => {
            const key = transaction.paymentMethod;
            const current = map.get(key) || { name: key, value: 0, transactions: 0 };
            map.set(key, {
                name: key,
                value: current.value + (transaction.actualPrice || 0),
                transactions: current.transactions + 1
            });
        });
        return Array.from(map.values()).sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);

    const trendData = useMemo(() => buildTrend(filteredTransactions), [filteredTransactions]);

    const expenseSummaryRows = useMemo<ExpenseCategorySummary[]>(() => {
        return financeCategories.map((category) => {
            const budget = budgets.find((item) => item.categoryId === category.categoryId)?.amount || 0;
            const actual = filteredExpenses
                .filter((expense) => expense.categoryId === category.categoryId)
                .reduce((sum, expense) => sum + (expense.amount || 0), 0);

            return {
                id: category.categoryId,
                backendId: category.id,
                categoryId: category.categoryId,
                name: category.name,
                kind: category.kind,
                description: category.description,
                budget,
                actual
            };
        });
    }, [budgets, financeCategories, filteredExpenses]);

    const expenseSummary = useMemo(() => buildExpenseSummary(expenseSummaryRows), [expenseSummaryRows]);

    const staffData = useMemo<StaffPoint[]>(() => {
        const map = new Map<number, StaffPoint>();
        filteredTransactions.forEach((transaction) => {
            (transaction.items || []).forEach((item) => {
                const staff = item.employee || transaction.employee;
                if (!staff?.id) return;

                const current = map.get(staff.id) || {
                    id: staff.id,
                    name: staff.name || "Tanpa nama",
                    gross: 0,
                    commission: 0,
                    transactions: 0
                };

                map.set(staff.id, {
                    ...current,
                    gross: current.gross + (item.price || 0),
                    commission: current.commission + calculateItemCommission(item),
                    transactions: current.transactions + 1
                });
            });
        });

        return Array.from(map.values()).sort((a, b) => b.commission - a.commission);
    }, [filteredTransactions]);

    const cashAfterExpense = summary.net - expenseSummary.actual;
    const averageTransaction = summary.transactions > 0 ? summary.gross / summary.transactions : 0;
    const activeRecurring = useMemo(() => recurringExpenses.filter((item) => item.active), [recurringExpenses]);
    const recurringMonthlyEstimate = useMemo(() => activeRecurring.reduce((sum, item) => {
        const multiplier = item.frequency === "DAILY" ? 30 : item.frequency === "WEEKLY" ? 4 : item.frequency === "QUARTERLY" ? 1 / 3 : item.frequency === "YEARLY" ? 1 / 12 : 1;
        return sum + (item.amount || 0) * multiplier;
    }, 0), [activeRecurring]);
    const reconciliationShortage = filteredReconciliations
        .filter((item) => item.status === "SHORT")
        .reduce((sum, item) => sum + Math.abs(item.difference || 0), 0);
    const transactionInsightData = useMemo(() => trendData.map((item) => ({
        name: item.name,
        omzet: item.gross,
        net: item.net,
        komisi: item.commission
    })), [trendData]);
    const expenseChartData = useMemo(() => expenseSummaryRows.map((item) => ({
        name: item.name,
        budget: item.budget,
        actual: item.actual
    })), [expenseSummaryRows]);
    const recurringChartData = useMemo(() => {
        const map = new Map<RecurringExpenseFrequency, number>();
        activeRecurring.forEach((item) => map.set(item.frequency, (map.get(item.frequency) || 0) + (item.amount || 0)));
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [activeRecurring]);
    const reconciliationChartData = useMemo(() => filteredReconciliations.map((item) => ({
        name: item.date,
        sistem: item.expectedCash,
        aktual: item.actualCash,
        selisih: item.difference
    })).reverse(), [filteredReconciliations]);

    const saveCategory = async () => {
        if (!categoryForm.name.trim()) {
            toast.error("Nama kategori wajib diisi.");
            return;
        }

        const payload = {
            ...categoryForm,
            categoryId: categoryForm.categoryId.trim() || categoryForm.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
        };
        const res = editingCategoryId
            ? await financeService.updateCategory(editingCategoryId, payload)
            : await financeService.createCategory(payload);

        if (!res.success) {
            toast.error(res.message || "Gagal menyimpan kategori.");
            return;
        }

        toast.success(editingCategoryId ? "Kategori diperbarui." : "Kategori ditambahkan.");
        setCategoryForm(emptyCategoryForm());
        setEditingCategoryId(null);
        await loadFinanceData();
    };

    const startEditCategory = (category: FinanceCategory) => {
        setEditingCategoryId(category.id);
        setCategoryForm({
            categoryId: category.categoryId,
            name: category.name,
            kind: category.kind,
            description: category.description,
            active: category.active
        });
    };

    const deleteCategory = async (id: number) => {
        const res = await financeService.deleteCategory(id);
        if (!res.success) {
            toast.error(res.message || "Gagal menghapus kategori.");
            return;
        }

        toast.success("Kategori dinonaktifkan.");
        await loadFinanceData();
    };

    const saveExpense = async () => {
        if (expenseForm.amount <= 0) {
            toast.error("Nominal pengeluaran harus lebih dari 0.");
            return;
        }

        const res = await financeService.createExpense(expenseForm);
        if (!res.success) {
            toast.error(res.message || "Gagal menyimpan pengeluaran.");
            return;
        }

        toast.success("Pengeluaran tersimpan.");
        setExpenseForm(emptyExpenseForm(findCategory(financeCategories, expenseForm.categoryId)));
        await loadFinanceData();
    };

    const saveBudget = async () => {
        if (budgetForm.amount < 0) {
            toast.error("Budget tidak valid.");
            return;
        }

        const res = await financeService.saveBudget({...budgetForm, month: budgetMonth});
        if (!res.success) {
            toast.error(res.message || "Gagal menyimpan budget.");
            return;
        }

        toast.success("Budget tersimpan.");
        setBudgetForm({...emptyBudgetForm(findCategory(financeCategories, budgetForm.categoryId)), month: budgetMonth});
        await loadFinanceData();
    };

    const saveRecurringExpense = async () => {
        if (!recurringForm.name.trim() || recurringForm.amount <= 0) {
            toast.error("Nama dan nominal recurring expense wajib diisi.");
            return;
        }
        if (!recurringForm.startDate) {
            toast.error("Tanggal mulai recurring expense wajib diisi.");
            return;
        }
        if (recurringForm.endDate && recurringForm.endDate < recurringForm.startDate) {
            toast.error("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
            return;
        }

        const res = await financeService.createRecurringExpense(recurringForm);
        if (!res.success) {
            toast.error(res.message || "Gagal menyimpan recurring expense.");
            return;
        }

        toast.success("Recurring expense tersimpan.");
        setRecurringForm(emptyRecurringForm(findCategory(financeCategories, recurringForm.categoryId)));
        await loadFinanceData();
    };

    const saveReconciliation = async () => {
        const res = await financeService.createCashReconciliation(reconciliationForm);
        if (!res.success) {
            toast.error(res.message || "Gagal menyimpan rekonsiliasi.");
            return;
        }

        toast.success("Rekonsiliasi kas tersimpan.");
        setReconciliationForm(emptyReconciliationForm());
        await loadFinanceData();
    };

    const deactivateRecurring = async (id: number) => {
        const res = await financeService.deactivateRecurringExpense(id);
        if (!res.success) {
            toast.error(res.message || "Gagal menonaktifkan recurring expense.");
            return;
        }

        toast.success("Recurring expense dinonaktifkan.");
        await loadFinanceData();
    };

    return (
        <AppShell
            title="Rekap Keuangan"
            subtitle="Omzet, expense, budget, recurring expense, rekonsiliasi kas, voucher, dan komisi staff."
            actions={<Chip icon={<WalletIcon />} label={`${filteredTransactions.length} transaksi`} color="secondary" />}
        >
            <Toaster />

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, mb: 3 }}>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} justifyContent="space-between">
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800}>Filter Rekap</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Semua angka, chart, ledger, expense, dan rekonsiliasi mengikuti periode serta metode bayar ini.
                        </Typography>
                    </Box>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                        <TextField
                            select
                            size="small"
                            label="Periode"
                            value={rangePreset}
                            onChange={(event) => setRangePreset(event.target.value)}
                            sx={{ minWidth: 160 }}
                        >
                            <MenuItem value="today">Hari ini</MenuItem>
                            <MenuItem value="7d">7 hari</MenuItem>
                            <MenuItem value="30d">30 hari</MenuItem>
                            <MenuItem value="month">Bulan ini</MenuItem>
                            <MenuItem value="all">Semua</MenuItem>
                            <MenuItem value="custom">Custom</MenuItem>
                        </TextField>
                        {rangePreset === "custom" && (
                            <>
                                <TextField size="small" type="date" label="Dari" InputLabelProps={{ shrink: true }} value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                                <TextField size="small" type="date" label="Sampai" InputLabelProps={{ shrink: true }} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                            </>
                        )}
                        <TextField
                            select
                            size="small"
                            label="Metode bayar"
                            value={paymentFilter}
                            onChange={(event) => setPaymentFilter(event.target.value as "all" | PaymentMethod)}
                            sx={{ minWidth: 170 }}
                        >
                            <MenuItem value="all">Semua</MenuItem>
                            <MenuItem value="CASH">CASH</MenuItem>
                            <MenuItem value="TRANSFER">TRANSFER</MenuItem>
                            <MenuItem value="QRIS">QRIS</MenuItem>
                        </TextField>
                    </Stack>
                </Stack>
            </Paper>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Omzet Masuk</Typography>
                        <Typography variant="h5" fontWeight={900}>{formatCurrency(summary.gross)}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Rata-rata Transaksi</Typography>
                        <Typography variant="h5" fontWeight={900}>{formatCurrency(averageTransaction)}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Net Setelah Komisi</Typography>
                        <Typography variant="h5" fontWeight={900}>{formatCurrency(summary.net)}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Cash Setelah Expense</Typography>
                        <Typography variant="h5" fontWeight={900}>{formatCurrency(cashAfterExpense)}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Paper sx={{ p: 3, borderRadius: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <TrendIcon color="primary" />
                            <Box>
                                <Typography variant="h6">Tren Keuangan Harian</Typography>
                                <Typography variant="body2" color="text.secondary">Omzet, net, komisi, dan voucher discount per hari.</Typography>
                            </Box>
                        </Stack>
                        <Box sx={{ height: 330 }}>
                            {trendData.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                    <Typography variant="body2" color="text.secondary">{loading ? "Memuat data..." : "Belum ada transaksi pada filter ini."}</Typography>
                                </Stack>
                            ) : (
                                <ResponsiveContainer>
                                    <LineChart data={trendData} margin={{ top: 8, right: 18, left: 8, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(143, 94, 54, 0.14)" />
                                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                        <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                                        <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value, name) => [formatCurrency(Number(value)), String(name)]} />
                                        <Legend />
                                        <Line type="monotone" dataKey="gross" name="Omzet" stroke="#B47B4C" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="net" name="Net" stroke="#6C8A6C" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="commission" name="Komisi" stroke="#C4705D" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" dataKey="voucher" name="Voucher" stroke="#D1A45E" strokeWidth={2.5} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Paper sx={{ p: 3, borderRadius: 1, height: "100%" }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                            <PaidIcon color="primary" />
                            <Box>
                                <Typography variant="h6">Metode Pembayaran</Typography>
                                <Typography variant="body2" color="text.secondary">Rekap penerimaan per channel.</Typography>
                            </Box>
                        </Stack>
                        <Box sx={{ height: 330 }}>
                            {paymentData.length === 0 ? (
                                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                                    <Typography variant="body2" color="text.secondary">Belum ada pembayaran.</Typography>
                                </Stack>
                            ) : (
                                <ResponsiveContainer>
                                    <BarChart data={paymentData} layout="vertical" margin={{ top: 8, right: 18, left: 16, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(143, 94, 54, 0.14)" />
                                        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                                        <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} />
                                        <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value) => [formatCurrency(Number(value)), "Omzet"]} />
                                        <Bar dataKey="value" fill="#B47B4C" radius={[0, 6, 6, 0]} maxBarSize={34} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Paper sx={{ p: 3, borderRadius: 1 }}>
                <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
                    <Tab icon={<ReceiptIcon />} iconPosition="start" label="Ledger Transaksi" />
                    <Tab icon={<SavingsIcon />} iconPosition="start" label="Komisi Staff" />
                    <Tab icon={<WalletIcon />} iconPosition="start" label="Expense & Budget" />
                    <Tab icon={<WalletIcon />} iconPosition="start" label="Recurring" />
                    <Tab icon={<PaidIcon />} iconPosition="start" label="Rekonsiliasi Kas" />
                </Tabs>
                <Divider sx={{ mb: 2 }} />

                {tab === 0 && (
                    <Stack spacing={2}>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Transaksi</Typography><Typography variant="h6" fontWeight={900}>{summary.transactions.toLocaleString("id-ID")}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Omzet Ledger</Typography><Typography variant="h6" fontWeight={900}>{formatCurrency(summary.gross)}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Voucher Discount</Typography><Typography variant="h6" fontWeight={900}>{formatCurrency(summary.voucher)}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Net Ledger</Typography><Typography variant="h6" fontWeight={900}>{formatCurrency(summary.net)}</Typography></Paper></Grid>
                        </Grid>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 2 }}>Grafik Ledger Harian</Typography>
                            <Box sx={{ height: 280 }}>
                                {transactionInsightData.length === 0 ? (
                                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}><Typography variant="body2" color="text.secondary">Belum ada data ledger.</Typography></Stack>
                                ) : (
                                    <ResponsiveContainer>
                                        <BarChart data={transactionInsightData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(143, 94, 54, 0.14)" />
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                                            <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value, name) => [formatCurrency(Number(value)), String(name)]} />
                                            <Legend />
                                            <Bar dataKey="omzet" name="Omzet" fill="#B47B4C" radius={[6, 6, 0, 0]} maxBarSize={34} />
                                            <Bar dataKey="net" name="Net" fill="#6C8A6C" radius={[6, 6, 0, 0]} maxBarSize={34} />
                                            <Bar dataKey="komisi" name="Komisi" fill="#C4705D" radius={[6, 6, 0, 0]} maxBarSize={34} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </Box>
                        </Paper>
                        <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Waktu</TableCell>
                                    <TableCell>Member</TableCell>
                                    <TableCell>Layanan</TableCell>
                                    <TableCell>Pembayaran</TableCell>
                                    <TableCell align="right">Omzet</TableCell>
                                    <TableCell align="right">Voucher</TableCell>
                                    <TableCell align="right">Komisi</TableCell>
                                    <TableCell align="right">Net</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredTransactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">{loading ? "Memuat transaksi..." : "Belum ada transaksi."}</TableCell>
                                    </TableRow>
                                ) : filteredTransactions.map((transaction) => {
                                    const commission = getTransactionCommission(transaction);
                                    return (
                                        <TableRow key={transaction.id} hover>
                                            <TableCell>{formatDateTime(transaction.date)}</TableCell>
                                            <TableCell>{transaction.customer?.name || "-"}</TableCell>
                                            <TableCell sx={{ maxWidth: 360 }}>{(transaction.items || []).map(getItemName).join(", ") || "-"}</TableCell>
                                            <TableCell>{transaction.paymentMethod}</TableCell>
                                            <TableCell align="right">{formatCurrency(transaction.actualPrice || 0)}</TableCell>
                                            <TableCell align="right">{formatCurrency(transaction.voucherDiscountAmount || 0)}</TableCell>
                                            <TableCell align="right">{formatCurrency(commission)}</TableCell>
                                            <TableCell align="right">{formatCurrency(Math.max(0, (transaction.actualPrice || 0) - commission))}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        </TableContainer>
                    </Stack>
                )}

                {tab === 1 && (
                    <Stack spacing={2}>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Staff Aktif di Filter</Typography><Typography variant="h6" fontWeight={900}>{staffData.length.toLocaleString("id-ID")}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Total Komisi</Typography><Typography variant="h6" fontWeight={900}>{formatCurrency(summary.commission)}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Basis Omzet Staff</Typography><Typography variant="h6" fontWeight={900}>{formatCurrency(staffData.reduce((sum, staff) => sum + staff.gross, 0))}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Komisi Tertinggi</Typography><Typography variant="h6" fontWeight={900}>{formatCurrency(staffData[0]?.commission || 0)}</Typography></Paper></Grid>
                        </Grid>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 2 }}>Grafik Komisi Staff</Typography>
                            <Box sx={{ height: 280 }}>
                                {staffData.length === 0 ? (
                                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}><Typography variant="body2" color="text.secondary">Belum ada komisi.</Typography></Stack>
                                ) : (
                                    <ResponsiveContainer>
                                        <BarChart data={staffData.slice(0, 8)}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(143, 94, 54, 0.14)" />
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                                            <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value, name) => [formatCurrency(Number(value)), String(name)]} />
                                            <Legend />
                                            <Bar dataKey="gross" name="Basis Omzet" fill="#B47B4C" radius={[6, 6, 0, 0]} maxBarSize={38} />
                                            <Bar dataKey="commission" name="Komisi" fill="#6C8A6C" radius={[6, 6, 0, 0]} maxBarSize={38} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </Box>
                        </Paper>
                        <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Staff</TableCell>
                                    <TableCell align="right">Item Ditangani</TableCell>
                                    <TableCell align="right">Basis Omzet</TableCell>
                                    <TableCell align="right">Estimasi Komisi</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {staffData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">Belum ada komisi pada filter ini.</TableCell>
                                    </TableRow>
                                ) : staffData.map((staff) => (
                                    <TableRow key={staff.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={800}>{staff.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">ID #{staff.id}</Typography>
                                        </TableCell>
                                        <TableCell align="right">{staff.transactions.toLocaleString("id-ID")}</TableCell>
                                        <TableCell align="right">{formatCurrency(staff.gross)}</TableCell>
                                        <TableCell align="right">{formatCurrency(staff.commission)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </TableContainer>
                    </Stack>
                )}

                {tab === 2 && (
                    <Stack spacing={2}>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Budget Bulanan</Typography><Typography variant="h6" fontWeight={900}>{formatCurrency(expenseSummary.budget)}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Realisasi Expense</Typography><Typography variant="h6" fontWeight={900}>{formatCurrency(expenseSummary.actual)}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Sisa Budget</Typography><Typography variant="h6" fontWeight={900}>{formatCurrency(expenseSummary.remainingBudget)}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Kategori</Typography><Typography variant="h6" fontWeight={900}>{expenseSummary.categoryCount.toLocaleString("id-ID")}</Typography></Paper></Grid>
                        </Grid>

                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 2 }}>Grafik Budget vs Expense</Typography>
                            <Box sx={{ height: 280 }}>
                                {expenseChartData.length === 0 ? (
                                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}><Typography variant="body2" color="text.secondary">Belum ada kategori.</Typography></Stack>
                                ) : (
                                    <ResponsiveContainer>
                                        <BarChart data={expenseChartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(143, 94, 54, 0.14)" />
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                                            <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value, name) => [formatCurrency(Number(value)), String(name)]} />
                                            <Legend />
                                            <Bar dataKey="budget" name="Budget" fill="#D1A45E" radius={[6, 6, 0, 0]} maxBarSize={38} />
                                            <Bar dataKey="actual" name="Realisasi" fill="#C4705D" radius={[6, 6, 0, 0]} maxBarSize={38} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </Box>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 2 }}>{editingCategoryId ? "Edit Kategori Keuangan" : "Tambah Kategori Keuangan"}</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" label="ID kategori" value={categoryForm.categoryId} onChange={(event) => setCategoryForm({...categoryForm, categoryId: event.target.value})} /></Grid>
                                <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth size="small" label="Nama kategori" value={categoryForm.name} onChange={(event) => setCategoryForm({...categoryForm, name: event.target.value})} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth select size="small" label="Jenis" value={categoryForm.kind} onChange={(event) => setCategoryForm({...categoryForm, kind: event.target.value as ExpenseKind})}><MenuItem value="FIXED">FIXED</MenuItem><MenuItem value="VARIABLE">VARIABLE</MenuItem><MenuItem value="ONE_TIME">ONE_TIME</MenuItem></TextField></Grid>
                                <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth size="small" label="Deskripsi" value={categoryForm.description} onChange={(event) => setCategoryForm({...categoryForm, description: event.target.value})} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><Stack direction="row" spacing={1}><Button fullWidth variant="contained" onClick={saveCategory}>{editingCategoryId ? "Update" : "Tambah"}</Button>{editingCategoryId && <Button variant="outlined" onClick={() => { setEditingCategoryId(null); setCategoryForm(emptyCategoryForm()); }}>Batal</Button>}</Stack></Grid>
                            </Grid>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 2 }}>Tambah Pengeluaran</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="date" label="Tanggal" InputLabelProps={{ shrink: true }} value={expenseForm.date} onChange={(event) => setExpenseForm({...expenseForm, date: event.target.value})} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth select size="small" label="Kategori" value={expenseForm.categoryId} onChange={(event) => setExpenseForm(applyCategoryToExpense(financeCategories, event.target.value, expenseForm))}>{financeCategories.map((category) => <MenuItem key={category.id} value={category.categoryId}>{category.name}</MenuItem>)}</TextField></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="number" label="Nominal" value={expenseForm.amount} onChange={(event) => setExpenseForm({...expenseForm, amount: Number(event.target.value)})} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth select size="small" label="Metode" value={expenseForm.paymentMethod} onChange={(event) => setExpenseForm({...expenseForm, paymentMethod: event.target.value as PaymentMethod})}><MenuItem value="CASH">CASH</MenuItem><MenuItem value="TRANSFER">TRANSFER</MenuItem><MenuItem value="QRIS">QRIS</MenuItem></TextField></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" label="Vendor" value={expenseForm.vendor} onChange={(event) => setExpenseForm({...expenseForm, vendor: event.target.value})} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={saveExpense} sx={{ height: 40 }}>Simpan</Button></Grid>
                                <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Catatan" value={expenseForm.notes} onChange={(event) => setExpenseForm({...expenseForm, notes: event.target.value})} /></Grid>
                            </Grid>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 2 }}>Budget Bulanan</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="month" label="Bulan" InputLabelProps={{ shrink: true }} value={budgetMonth} onChange={(event) => setBudgetMonth(event.target.value)} /></Grid>
                                <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth select size="small" label="Kategori" value={budgetForm.categoryId} onChange={(event) => setBudgetForm(applyCategoryToBudget(financeCategories, event.target.value, budgetForm))}>{financeCategories.map((category) => <MenuItem key={category.id} value={category.categoryId}>{category.name}</MenuItem>)}</TextField></Grid>
                                <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth size="small" type="number" label="Budget" value={budgetForm.amount} onChange={(event) => setBudgetForm({...budgetForm, amount: Number(event.target.value)})} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><Button fullWidth variant="outlined" onClick={saveBudget} sx={{ height: 40 }}>Simpan Budget</Button></Grid>
                            </Grid>
                        </Paper>

                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Kategori</TableCell>
                                        <TableCell>Jenis</TableCell>
                                        <TableCell>Catatan</TableCell>
                                        <TableCell align="right">Budget</TableCell>
                                        <TableCell align="right">Realisasi</TableCell>
                                        <TableCell align="right">Sisa</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">Aksi</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {expenseSummaryRows.map((category) => (
                                        <TableRow key={category.id} hover>
                                            <TableCell><Typography variant="body2" fontWeight={800}>{category.name}</Typography><Typography variant="caption" color="text.secondary">ID: {category.categoryId}</Typography></TableCell>
                                            <TableCell>{category.kind}</TableCell>
                                            <TableCell sx={{ maxWidth: 360 }}>{category.description}</TableCell>
                                            <TableCell align="right">{formatCurrency(category.budget)}</TableCell>
                                            <TableCell align="right">{formatCurrency(category.actual)}</TableCell>
                                            <TableCell align="right">{formatCurrency(category.budget - category.actual)}</TableCell>
                                            <TableCell><Chip size="small" label={getExpenseStatus(category)} color={getExpenseStatus(category) === "Aman" ? "success" : "default"} /></TableCell>
                                            <TableCell align="right"><Stack direction="row" spacing={1} justifyContent="flex-end"><Button size="small" onClick={() => startEditCategory(financeCategories.find((item) => item.id === category.backendId) || defaultCategory)}>Edit</Button><Button size="small" color="error" onClick={() => deleteCategory(category.backendId)}>Hapus</Button></Stack></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Tanggal</TableCell>
                                        <TableCell>Kategori</TableCell>
                                        <TableCell>Vendor</TableCell>
                                        <TableCell>Metode</TableCell>
                                        <TableCell>Catatan</TableCell>
                                        <TableCell align="right">Nominal</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredExpenses.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} align="center">Belum ada expense pada filter ini.</TableCell></TableRow>
                                    ) : filteredExpenses.map((expense) => (
                                        <TableRow key={expense.id} hover>
                                            <TableCell>{expense.date}</TableCell>
                                            <TableCell>{expense.categoryName}</TableCell>
                                            <TableCell>{expense.vendor || "-"}</TableCell>
                                            <TableCell>{expense.paymentMethod}</TableCell>
                                            <TableCell>{expense.notes || "-"}</TableCell>
                                            <TableCell align="right">{formatCurrency(expense.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Stack>
                )}

                {tab === 3 && (
                    <Stack spacing={2}>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Template Aktif</Typography><Typography variant="h6" fontWeight={900}>{activeRecurring.length.toLocaleString("id-ID")}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Estimasi Bulanan</Typography><Typography variant="h6" fontWeight={900}>{formatCurrency(recurringMonthlyEstimate)}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Expense Harian</Typography><Typography variant="h6" fontWeight={900}>{activeRecurring.filter((item) => item.frequency === "DAILY").length.toLocaleString("id-ID")}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Nonaktif</Typography><Typography variant="h6" fontWeight={900}>{recurringExpenses.filter((item) => !item.active).length.toLocaleString("id-ID")}</Typography></Paper></Grid>
                        </Grid>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 2 }}>Grafik Recurring per Frekuensi</Typography>
                            <Box sx={{ height: 260 }}>
                                {recurringChartData.length === 0 ? (
                                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}><Typography variant="body2" color="text.secondary">Belum ada recurring expense aktif.</Typography></Stack>
                                ) : (
                                    <ResponsiveContainer>
                                        <BarChart data={recurringChartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(143, 94, 54, 0.14)" />
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                                            <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value) => [formatCurrency(Number(value)), "Nominal"]} />
                                            <Bar dataKey="value" fill="#6C8A6C" radius={[6, 6, 0, 0]} maxBarSize={42} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </Box>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 2 }}>Tambah Recurring Expense</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" label="Nama" value={recurringForm.name} onChange={(event) => setRecurringForm({...recurringForm, name: event.target.value})} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth select size="small" label="Kategori" value={recurringForm.categoryId} onChange={(event) => setRecurringForm(applyCategoryToRecurring(financeCategories, event.target.value, recurringForm))}>{financeCategories.map((category) => <MenuItem key={category.id} value={category.categoryId}>{category.name}</MenuItem>)}</TextField></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="number" label="Nominal" value={recurringForm.amount} onChange={(event) => setRecurringForm({...recurringForm, amount: Number(event.target.value)})} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth select size="small" label="Frekuensi" value={recurringForm.frequency} onChange={(event) => setRecurringForm({...recurringForm, frequency: event.target.value as RecurringExpenseFrequency})}><MenuItem value="DAILY">Harian</MenuItem><MenuItem value="WEEKLY">Mingguan</MenuItem><MenuItem value="MONTHLY">Bulanan</MenuItem><MenuItem value="QUARTERLY">Kuartalan</MenuItem><MenuItem value="YEARLY">Tahunan</MenuItem></TextField></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="date" label="Mulai" InputLabelProps={{ shrink: true }} value={recurringForm.startDate} onChange={(event) => setRecurringForm({...recurringForm, startDate: event.target.value, nextDueDate: event.target.value})} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="date" label="Selesai (opsional)" InputLabelProps={{ shrink: true }} value={recurringForm.endDate || ""} onChange={(event) => setRecurringForm({...recurringForm, endDate: event.target.value || null})} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={saveRecurringExpense} sx={{ height: 40 }}>Simpan</Button></Grid>
                            </Grid>
                        </Paper>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Nama</TableCell>
                                        <TableCell>Kategori</TableCell>
                                        <TableCell>Frekuensi</TableCell>
                                        <TableCell>Mulai</TableCell>
                                        <TableCell>Selesai</TableCell>
                                        <TableCell>Jatuh Tempo</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">Nominal</TableCell>
                                        <TableCell align="right">Aksi</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {recurringExpenses.length === 0 ? (
                                        <TableRow><TableCell colSpan={9} align="center">Belum ada recurring expense.</TableCell></TableRow>
                                    ) : recurringExpenses.map((item) => (
                                        <TableRow key={item.id} hover>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.categoryName}</TableCell>
                                            <TableCell>{item.frequency}</TableCell>
                                            <TableCell>{item.startDate || item.nextDueDate}</TableCell>
                                            <TableCell>{item.endDate || "Unlimited"}</TableCell>
                                            <TableCell>{item.nextDueDate}</TableCell>
                                            <TableCell><Chip size="small" label={item.active ? "Aktif" : "Nonaktif"} color={item.active ? "success" : "default"} /></TableCell>
                                            <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
                                            <TableCell align="right"><Button size="small" disabled={!item.active} onClick={() => deactivateRecurring(item.id)}>Nonaktifkan</Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Stack>
                )}

                {tab === 4 && (
                    <Stack spacing={2}>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Rekonsiliasi</Typography><Typography variant="h6" fontWeight={900}>{filteredReconciliations.length.toLocaleString("id-ID")}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Balanced</Typography><Typography variant="h6" fontWeight={900}>{filteredReconciliations.filter((item) => item.status === "BALANCED").length.toLocaleString("id-ID")}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Total Short</Typography><Typography variant="h6" fontWeight={900}>{formatCurrency(reconciliationShortage)}</Typography></Paper></Grid>
                            <Grid size={{ xs: 12, md: 3 }}><Paper sx={{ p: 2, borderRadius: 1 }}><Typography variant="caption" color="text.secondary">Selisih Terakhir</Typography><Typography variant="h6" fontWeight={900}>{formatCurrency(filteredReconciliations[0]?.difference || 0)}</Typography></Paper></Grid>
                        </Grid>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 2 }}>Grafik Kas Sistem vs Aktual</Typography>
                            <Box sx={{ height: 260 }}>
                                {reconciliationChartData.length === 0 ? (
                                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}><Typography variant="body2" color="text.secondary">Belum ada data rekonsiliasi.</Typography></Stack>
                                ) : (
                                    <ResponsiveContainer>
                                        <LineChart data={reconciliationChartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(143, 94, 54, 0.14)" />
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} />
                                            <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                                            <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value, name) => [formatCurrency(Number(value)), String(name)]} />
                                            <Legend />
                                            <Line type="monotone" dataKey="sistem" name="Kas Sistem" stroke="#B47B4C" strokeWidth={2.5} />
                                            <Line type="monotone" dataKey="aktual" name="Kas Aktual" stroke="#6C8A6C" strokeWidth={2.5} />
                                            <Line type="monotone" dataKey="selisih" name="Selisih" stroke="#C4705D" strokeWidth={2.5} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </Box>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1 }}>
                            <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 2 }}>Rekonsiliasi Kas Harian</Typography>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="date" label="Tanggal" InputLabelProps={{ shrink: true }} value={reconciliationForm.date} onChange={(event) => setReconciliationForm({...reconciliationForm, date: event.target.value})} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" label="Kas Sistem" value={formatCurrency(expectedCash)} InputProps={{ readOnly: true }} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" type="number" label="Kas Aktual" value={reconciliationForm.actualCash} onChange={(event) => setReconciliationForm({...reconciliationForm, actualCash: Number(event.target.value)})} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" label="Kasir" value={reconciliationForm.cashierName} onChange={(event) => setReconciliationForm({...reconciliationForm, cashierName: event.target.value})} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><TextField fullWidth size="small" label="Catatan" value={reconciliationForm.notes} onChange={(event) => setReconciliationForm({...reconciliationForm, notes: event.target.value})} /></Grid>
                                <Grid size={{ xs: 12, md: 2 }}><Button fullWidth variant="contained" onClick={saveReconciliation} sx={{ height: 40 }}>Simpan</Button></Grid>
                            </Grid>
                        </Paper>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Tanggal</TableCell>
                                        <TableCell>Kasir</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Catatan</TableCell>
                                        <TableCell align="right">Kas Sistem</TableCell>
                                        <TableCell align="right">Kas Aktual</TableCell>
                                        <TableCell align="right">Selisih</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredReconciliations.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} align="center">Belum ada rekonsiliasi pada filter ini.</TableCell></TableRow>
                                    ) : filteredReconciliations.map((item) => (
                                        <TableRow key={item.id} hover>
                                            <TableCell>{item.date}</TableCell>
                                            <TableCell>{item.cashierName || "-"}</TableCell>
                                            <TableCell><Chip size="small" label={item.status} color={item.status === "BALANCED" ? "success" : item.status === "SHORT" ? "error" : "warning"} /></TableCell>
                                            <TableCell>{item.notes || "-"}</TableCell>
                                            <TableCell align="right">{formatCurrency(item.expectedCash)}</TableCell>
                                            <TableCell align="right">{formatCurrency(item.actualCash)}</TableCell>
                                            <TableCell align="right">{formatCurrency(item.difference)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Stack>
                )}
            </Paper>
        </AppShell>
    );
}
