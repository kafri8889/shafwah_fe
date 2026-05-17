import {useEffect, useMemo, useState} from "react";
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
    MonetizationOn as MoneyIcon,
    People as PeopleIcon,
    ReceiptLong as ReceiptIcon,
    Spa as SpaIcon
} from "@mui/icons-material";
import CashierDrawer from "./CashierDrawer.tsx";
import toast, {Toaster} from "react-hot-toast";
import {
    type CartItem,
    type Customer,
    type Employee,
    type PaymentMethod,
    TransactionItem,
    type TransactionRequest
} from "../../api/types.ts";
import {transactionService} from "../../api/service/transactionService.ts";
import AppShell from "../../components/AppShell.tsx";

function parseTransactionDate(value: string) {
    const parsed = new Date(value.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

type TransactionDraft = {
    id: number;
    time: string;
    customer: Customer;
    employee: Employee;
    amount: number;
    items: CartItem[];
    paymentMethod?: PaymentMethod;
    notes?: string;
    isLegacy?: boolean;
    legacyCommissionPercent?: number;
    memberVoucherId?: number | null;
};

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export default function DashboardPage() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<TransactionItem | null>(null);
    const [rangePreset, setRangePreset] = useState("today");
    const [startDate, setStartDate] = useState(formatDateInput(new Date()));
    const [endDate, setEndDate] = useState(formatDateInput(new Date()));

    const visibleTransactions = useMemo(() => {
        const today = new Date();
        let rangeStart: Date | null = null;
        let rangeEnd: Date | null = null;

        if (rangePreset === "today") {
            rangeStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            rangeEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        } else if (rangePreset === "7d") {
            rangeStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
        } else if (rangePreset === "30d") {
            rangeStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
        } else if (rangePreset === "month") {
            rangeStart = new Date(today.getFullYear(), today.getMonth(), 1);
            rangeEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        } else if (rangePreset === "custom" && startDate && endDate) {
            rangeStart = new Date(startDate);
            rangeEnd = new Date(endDate);
            rangeEnd.setHours(23, 59, 59, 999);
        }

        return transactions.filter((trx) => {
            const date = parseTransactionDate(trx.time);
            if (!date) return false;
            if (rangeStart && date < rangeStart) return false;
            if (rangeEnd && date >= rangeEnd) return false;
            return true;
        }).sort((a, b) => {
            const aDate = parseTransactionDate(a.time)?.getTime() || 0;
            const bDate = parseTransactionDate(b.time)?.getTime() || 0;
            return bDate - aDate;
        });
    }, [transactions, rangePreset, startDate, endDate]);

    const totalRevenue = useMemo(() => visibleTransactions.reduce((total, trx) => total + trx.amount, 0), [visibleTransactions]);
    const totalCustomers = useMemo(() => new Set(visibleTransactions.map(trx => trx.customer?.id || trx.customer?.name)).size, [visibleTransactions]);
    const totalFilteredTransactions = visibleTransactions.length;
    const topService = useMemo(() => {
        const counts = new Map<string, number>();
        visibleTransactions.forEach(trx => {
            trx.items?.forEach(item => {
                counts.set(item.name, (counts.get(item.name) || 0) + 1);
            });
        });
        const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
        return sorted[0]?.[0] || "-";
    }, [visibleTransactions]);

    const newTransaction = () => {
        setSelectedTransaction(null);
        setDrawerOpen(true);
    };

    const editTransaction = (trx: TransactionItem) => {
        setSelectedTransaction(trx);
        setDrawerOpen(true);
    };

    const confirmDeleteTransaction = (trx: TransactionItem) => {
        setTransactionToDelete(trx);
        setDeleteDialogOpen(true);
    };

    const closeDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setTransactionToDelete(null);
    };

    const handleDeleteTransaction = () => {
        if (!transactionToDelete) return;

        const id = transactionToDelete.id;

        const promise = transactionService.delete(id).then(res => {
            if (!res.success) {
                throw new Error(res.message || "Unable to delete transaction!");
            }

            setTransactions(prev => prev.filter(t => t.id !== id));
            setDeleteDialogOpen(false);
            setTransactionToDelete(null);
            return res;
        });

        toast.promise(promise, {
            loading: "Deleting transaction...",
            success: () => `Transacion with ID #${id} deleted!`,
            error: (err: unknown) => getErrorMessage(err, "Unable to delete transaction!")
        }).then(() => {});
    };

    const saveTransaction = (txDataRaw: TransactionDraft | TransactionDraft[]) => {
        if (Array.isArray(txDataRaw)) {
            const legacyRows = txDataRaw.filter((item) => item.isLegacy);
            if (legacyRows.length === 0) return;

            const promise = Promise.all(legacyRows.map((row) => transactionService.createLegacy({
                employeeId: row.employee.id,
                commissionPercent: row.legacyCommissionPercent || 10,
                actualPrice: row.amount,
                paymentMethod: row.paymentMethod || "CASH",
                notes: row.notes || "",
                date: row.time
            }))).then((responses) => {
                const failed = responses.find((res) => !res.success || !res.data);
                if (failed) {
                    throw new Error(failed.message || "Unable to save legacy transactions!");
                }

                const savedTransactions = responses
                    .map((res) => res.data)
                    .filter((item): item is NonNullable<typeof item> => Boolean(item))
                    .map((item) => new TransactionItem(item));

                setTransactions(prev => [...savedTransactions, ...prev]);
                setDrawerOpen(false);
                return responses;
            });

            toast.promise(promise, {
                loading: `Saving ${legacyRows.length} legacy transactions...`,
                success: () => `${legacyRows.length} transaksi buku tersimpan!`,
                error: (err: unknown) => getErrorMessage(err, "Unable to save legacy transactions!")
            }).then(() => {});
            return;
        }

        if (txDataRaw.isLegacy) {
            const promise = transactionService.createLegacy({
                employeeId: txDataRaw.employee.id,
                commissionPercent: txDataRaw.legacyCommissionPercent || 10,
                actualPrice: txDataRaw.amount,
                paymentMethod: txDataRaw.paymentMethod || "CASH",
                notes: txDataRaw.notes || "",
                date: txDataRaw.time
            }).then(res => {
                if (!res.success || !res.data) {
                    throw new Error(res.message || "Unable to save legacy transaction!");
                }

                const saved = res.data;
                setTransactions(prev => [new TransactionItem(saved), ...prev]);
                setDrawerOpen(false);
                return res;
            });

            toast.promise(promise, {
                loading: "Saving legacy transaction...",
                success: () => "Transaksi buku tersimpan!",
                error: (err: unknown) => getErrorMessage(err, "Unable to save legacy transaction!")
            }).then(() => {});
            return;
        }

        // Convert CartItem -> TransactionItemRequest
        const itemsPayload = txDataRaw.items.map((item: CartItem) => ({
            treatmentType: item.treatmentType,
            treatmentId: item.treatmentType === "Single" ? item.id : null,
            treatmentPackageId: item.treatmentType === "Package" ? item.id : null,
            price: item.price,
            employeeId: item.employee?.id ?? txDataRaw.employee.id
        }));

        const payload: TransactionRequest = {
            employeeId: txDataRaw.employee.id,
            customer: {
                id: txDataRaw.customer?.id ?? undefined,
                name: txDataRaw.customer?.name || "",
                phoneNumber: txDataRaw.customer?.phoneNumber || "",
                birthDate: txDataRaw.customer?.birthDate || null,
            },
            items: itemsPayload,
            actualPrice: txDataRaw.amount,
            paymentMethod: txDataRaw.paymentMethod || "CASH",
            notes: txDataRaw.notes || "",
            date: txDataRaw.time,
            memberVoucherId: txDataRaw.memberVoucherId ?? null,
        };

        const isUpdate = transactions.some(t => t.id === txDataRaw.id);

        const promise = (
            isUpdate
                ? transactionService.update(txDataRaw.id, payload)
                : transactionService.create(payload)
        ).then(res => {
            if (!res.success || !res.data) {
                throw new Error(res.message || "Unable to save transaction!");
            }

            const newTransaction = new TransactionItem(res.data);

            setTransactions(prev => {
                const index = prev.findIndex(t => t.id === newTransaction.id);

                if (index >= 0) {
                    const copy = [...prev];
                    copy[index] = newTransaction;
                    return copy;
                }

                return [newTransaction, ...prev];
            });

            setDrawerOpen(false);
            return res;
        });

        toast.promise(promise, {
            loading: isUpdate ? "Updating transaction..." : "Saving transaction...",
            success: isUpdate
                ? () => `Transaction #${txDataRaw.id} updated!`
                : () => "Transaction saved!",
            error: (err: unknown) =>
                getErrorMessage(err, isUpdate ? "Transaction update failed!" : "Unable to save new transaction!")
        }).then(() => {});
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const resTransaction = await transactionService.getAll();

                if (resTransaction?.success && Array.isArray(resTransaction.data)) {
                    setTransactions(resTransaction.data.map(record => new TransactionItem(record)));
                } else setTransactions([]);
            } catch (error) {
                console.error("Failed to fetch data: ", error);
                setTransactions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);


    const summaryData = [
        {
            title: "Pendapatan",
            value: `Rp ${totalRevenue.toLocaleString('id-ID')}`,
            icon: <MoneyIcon sx={{ fontSize: 26, color: "white" }} />,
            color: "#B47B4C",
            subtext: "Sesuai filter table"
        },
        {
            title: "Pelanggan",
            value: `${totalCustomers} Orang`,
            icon: <PeopleIcon sx={{ fontSize: 26, color: "white" }} />,
            color: "#C4705D",
            subtext: "Unik di data table"
        },
        {
            title: "Total Transaksi",
            value: `${totalFilteredTransactions}`,
            icon: <ReceiptIcon sx={{ fontSize: 26, color: "white" }} />,
            color: "#D1A45E",
            subtext: "Setelah filter range"
        },
        {
            title: "Layanan Terlaris",
            value: topService,
            icon: <SpaIcon sx={{ fontSize: 26, color: "white" }} />,
            color: "#8F5E36",
            subtext: "Dari data table"
        }
    ];

    return (
        <AppShell
            title="Dashboard"
            subtitle="Pantau performa harian, transaksi terakhir, dan akses cepat ke kasir."
            actions={
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={newTransaction}
                >
                    Transaksi Baru
                </Button>
            }
        >
            <Toaster />
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, mb: 3 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} justifyContent="space-between">
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700}>
                            Filter Data Transaksi
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Insight card dan table memakai range data yang sama.
                        </Typography>
                    </Box>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                        <TextField
                            select
                            size="small"
                            label="Range"
                            value={rangePreset}
                            onChange={(e) => setRangePreset(e.target.value)}
                            sx={{ minWidth: 160 }}
                        >
                            <MenuItem value="today">Hari ini</MenuItem>
                            <MenuItem value="7d">7 hari terakhir</MenuItem>
                            <MenuItem value="30d">30 hari terakhir</MenuItem>
                            <MenuItem value="month">Bulan ini</MenuItem>
                            <MenuItem value="all">Semua data</MenuItem>
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
                            </>
                        )}
                    </Stack>
                </Stack>
            </Paper>
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {summaryData.map((card, index) => (
                    <Grid size={{ xs: 12, md: 3 }} key={index}>
                        <Card sx={{ borderRadius: 1, height: "100%" }}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                                    <Avatar
                                        variant="rounded"
                                        sx={{
                                            bgcolor: card.color,
                                            width: 46,
                                            height: 46,
                                            mr: 2,
                                            borderRadius: 1,
                                            boxShadow: '0 6px 14px rgba(60, 47, 42, 0.18)'
                                        }}
                                    >
                                    {card.icon}
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                        {card.title}
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" sx={{ my: 0.5 }}>
                                        {card.value}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                            {card.subtext}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Paper sx={{ p: 3, borderRadius: 1 }}>
                <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                    <Box>
                        <Typography variant="h6" fontWeight="bold">
                            Transaksi Terakhir
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Ringkas transaksi terbaru yang masuk di kasir.
                        </Typography>
                    </Box>
                    <Chip label={`${visibleTransactions.length} transaksi`} color="secondary" />
                </Stack>

                <Divider sx={{ mb: 2 }} />

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>JAM</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>PELANGGAN</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>STYLIST</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>LAYANAN</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>HARGA</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>STATUS</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }} align="right">ACTION</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        Memuat transaksi...
                                    </TableCell>
                                </TableRow>
                            ) : visibleTransactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        Belum ada transaksi :(
                                    </TableCell>
                                </TableRow>
                            ) : (
                                visibleTransactions.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        hover
                                    >
                                        <TableCell>{row.time}</TableCell>
                                        <TableCell sx={{ fontWeight: 'medium' }}>{row.customer.name}</TableCell>
                                        <TableCell sx={{ fontWeight: 'medium' }}>{row.employee.name}</TableCell>
                                        <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {row.service}
                                        </TableCell>
                                        <TableCell>Rp {row.amount.toLocaleString('id-ID')}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={row.status}
                                                size="small"
                                                color="success"
                                                sx={{ fontWeight: 'bold', borderRadius: 1 }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Edit Transaction">
                                                <IconButton size="small" onClick={() => editTransaction(row)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete Transaction">
                                                <IconButton size="small" onClick={() => confirmDeleteTransaction(row)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog
                open={deleteDialogOpen}
                onClose={closeDeleteDialog}
            >
                <DialogTitle>Hapus Transaksi</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {`Yakin ingin menghapus transaksi #${transactionToDelete?.id ?? ""}?`}
                        </DialogContentText>
                        </DialogContent>
                <DialogActions>
                    <Button onClick={closeDeleteDialog}>
                        Batal
                    </Button>
                    <Button onClick={handleDeleteTransaction} color="error" variant="contained">
                        Hapus
                    </Button>
                </DialogActions>
            </Dialog>

            <CashierDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                initialData={selectedTransaction}
                onSubmit={saveTransaction}
            />
        </AppShell>
    );
}
