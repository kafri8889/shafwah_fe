import {useEffect, useState} from "react";
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
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
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
    TrendingUp as TrendingUpIcon
} from "@mui/icons-material";
import CashierDrawer from "./CashierDrawer.tsx";
import toast, {Toaster} from "react-hot-toast";
import {TransactionItem} from "../../api/types.ts";
import {transactionService} from "../../api/service/transactionService.ts";

export default function DashboardPage() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<TransactionItem | null>(null);

    const totalRevenue = transactions.reduce((total, trx) => total + trx.amount, 0);
    const totalCustomers = transactions.length;
    const totalMonthlyTransactions = transactions.length;

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
            error: (err: any) => err?.message || "Unable to delete transaction!"
        }).then(() => {});
    };

    const saveTransaction = (txDataRaw: any) => {
        const mainItem = txDataRaw.items[0];

        const payload = {
            employeeId: txDataRaw.employee.id,
            treatmentId: mainItem.type === "TREATMENT" ? mainItem.id : null,
            treatmentPackageId: mainItem.type === "PACKAGE" ? mainItem.id : null,
            customer: {
                id: txDataRaw.customer.id,
                name: txDataRaw.customer.name || "",
                phoneNumber: txDataRaw.customer.phoneNumber || "",
            },
            actualPrice: txDataRaw.amount,
            paymentMethod: "CASH",
            notes: "",
            date: new Date().toISOString().slice(0, 10)
        };

        const isUpdate = transactions.some(t => t.id === txDataRaw.id);

        const promise = (isUpdate ? transactionService.update(txDataRaw.id, payload) : transactionService.create(payload)).then(res => {
            if (!res.success || !res.data) {
                throw new Error(res.message || "Unable to save new transaction!");
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
            error: (err: any) =>
                err?.message || (isUpdate ? "Transaction update failed!" : "Unable to save new transaction!")
        }).then(() => {});
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const resTransaction = await transactionService.getAll();

                if (resTransaction?.success && Array.isArray(resTransaction.data)) {
                    setTransactions(resTransaction.data.map((record) => new TransactionItem(record)));
                } else {
                    setTransactions([]);
                }
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
            title: "Pendapatan Hari Ini",
            value: `Rp ${totalRevenue.toLocaleString('id-ID')}`,
            icon: <MoneyIcon sx={{ fontSize: 30, color: "white" }} />,
            color: "#10B981",
            subtext: "+15% dari kemarin"
        },
        {
            title: "Pelanggan Hari Ini",
            value: `${totalCustomers} Orang`,
            icon: <PeopleIcon sx={{ fontSize: 30, color: "white" }} />,
            color: "#3B82F6",
            subtext: "Ramai lancar"
        },
        {
            title: "Total Transaksi Bulan Ini",
            value: `${totalMonthlyTransactions}`,
            icon: <ReceiptIcon sx={{ fontSize: 30, color: "white" }} />,
            color: "#F59E0B",
            subtext: "Target: 200"
        }
    ];

    return (
        <Box sx={{ m: 4 }}>
            <Toaster />
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Dashboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Selamat datang kembali, Etmin!
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={newTransaction}
                    sx={{ height: 'fit-content', py: 1.5, px: 3, borderRadius: 3 }}
                >
                    New Transaction
                </Button>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                {summaryData.map((card, index) => (
                    <Grid item xs={12} md={4} key={index}>
                        <Card sx={{ borderRadius: 2, boxShadow: '0px 4px 20px rgba(0,0,0,0.05)' }}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                                <Avatar
                                    variant="rounded"
                                    sx={{
                                        bgcolor: card.color,
                                        width: 56,
                                        height: 56,
                                        mr: 2,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
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
                                        <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                        <Typography variant="caption" color="success.main" fontWeight="bold">
                                            {card.subtext}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0px 4px 20px rgba(0,0,0,0.05)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                        Transaksi Terakhir
                    </Typography>
                </Box>

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
                                        Loading transaction data...
                                    </TableCell>
                                </TableRow>
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        Belum ada transaksi :(
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((row) => (
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
        </Box>
    );
}
