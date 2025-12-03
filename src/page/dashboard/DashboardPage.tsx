import { useState } from "react";
import {
    Box,
    Grid,
    Paper,
    Typography,
    Card,
    CardContent,
    Avatar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Divider,
    Button,
    IconButton,
    Tooltip
} from "@mui/material";
import {
    MonetizationOn as MoneyIcon,
    People as PeopleIcon,
    ReceiptLong as ReceiptIcon,
    TrendingUp as TrendingUpIcon,
    Add as AddIcon,
    Edit as EditIcon
} from "@mui/icons-material";
import CashierDrawer from "./CashierDrawer.tsx";
import toast, { Toaster } from "react-hot-toast";
import { MOCK_RECORDS } from "../../data/dummy.ts";
import { TransactionItem } from "../../api/types.ts";

export default function DashboardPage() {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);

    const [transactions, setTransactions] = useState<TransactionItem[]>(() => {
        return MOCK_RECORDS.map((record) => new TransactionItem(record));
    });

    const totalRevenue = transactions.reduce((total, trx) => total + trx.amount, 0);
    const totalCustomers = transactions.length;
    const totalMonthlyTransactions = 140 + transactions.length;

    const newTransaction = () => {
        setSelectedTransaction(null);
        setDrawerOpen(true);
    };

    const editTransaction = (trx: TransactionItem) => {
        setSelectedTransaction(trx);
        setDrawerOpen(true);
    };

    const saveTransaction = (txDataRaw: any) => {
        const newTransaction = new TransactionItem(txDataRaw);

        const existingIndex = transactions.findIndex(t => t.id === newTransaction.id);

        if (existingIndex >= 0) {
            const updatedTransactions = [...transactions];
            updatedTransactions[existingIndex] = newTransaction;
            setTransactions(updatedTransactions);
            toast.success(`Transaksi #${newTransaction.id} berhasil diperbarui!`);
        } else {
            setTransactions([newTransaction, ...transactions]);
            toast.success('Transaksi baru berhasil disimpan!');
        }

        setDrawerOpen(false);
    };

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
                        Selamat datang kembali, Admin!
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={newTransaction}
                    sx={{ height: 'fit-content', py: 1.5, px: 3, borderRadius: 3 }}
                >
                    Transaksi Baru
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

            <Paper sx={{ p: 3, borderRadius: 4, boxShadow: '0px 4px 20px rgba(0,0,0,0.05)' }}>
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
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>LAYANAN</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>HARGA</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>STATUS</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }} align="right">AKSI</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {transactions.map((row) => (
                                <TableRow
                                    key={row.id}
                                    hover
                                >
                                    <TableCell>{row.time}</TableCell>
                                    <TableCell sx={{ fontWeight: 'medium' }}>{row.customer}</TableCell>
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
                                        <Tooltip title="Edit Transaksi">
                                            <IconButton size="small" onClick={() => editTransaction(row)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <CashierDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                initialData={selectedTransaction}
                onSubmit={saveTransaction}
            />
        </Box>
    );
}