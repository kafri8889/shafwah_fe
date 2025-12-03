import { useState, useMemo, useEffect } from "react";
import {
    Box,
    Typography,
    Divider,
    Button,
    Drawer,
    TextField,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Stack,
    MenuItem,
    Paper,
    Tabs,
    Tab,
    InputAdornment
} from "@mui/material";
import {
    Close as CloseIcon,
    Delete as DeleteIcon,
    ShoppingCart as CartIcon,
    Spa as SpaIcon,
    Inventory as PackageIcon,
    Search as SearchIcon
} from "@mui/icons-material";
import { MOCK_TREATMENTS, MOCK_PACKAGES, MOCK_EMPLOYEES } from "../../data/dummy.ts";
import { TransactionItem, type CartItem } from "../../api/types.ts";

interface CashierDrawerProps {
    open: boolean;
    onClose: () => void;
    initialData?: TransactionItem | null;
    onSubmit: (transactionData: {
        id: number;
        time: string;
        customer: string;
        service: string;
        amount: number;
        status: string;
        items: CartItem[]
    }) => void;
}

export default function CashierDrawer({ open, onClose, initialData, onSubmit }: CashierDrawerProps) {
    const [customerName, setCustomerName] = useState("");
    const [employeeName, setEmployeeName] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (open) {
            // If initial data not null, berarti edit mode
            if (initialData) {
                setCustomerName(initialData.customer);
                setCart(initialData.items || []);
            } else { // Kalo null, berarti buat baru
                setCustomerName("");
                setEmployeeName("");
                setCart([]);
                setTabValue(0);
                setSearchTerm("");
            }
        }
    }, [open, initialData]);

    const filteredTreatments = useMemo(() => {
        if (!searchTerm) return MOCK_TREATMENTS;
        return MOCK_TREATMENTS.filter(t =>
            t.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    const addTreatmentToCart = (item: typeof MOCK_TREATMENTS[0]) => {
        const newItem: CartItem = {
            id: item.id,
            name: item.title,
            price: item.prices[0],
            type: 'TREATMENT'
        };
        setCart([...cart, newItem]);
    };

    const addPackageToCart = (pkg: typeof MOCK_PACKAGES[0]) => {
        const treatmentNames = pkg.treatments.map(t => t.title).join(", ");

        const newItem: CartItem = {
            id: pkg.id,
            name: pkg.title,
            price: pkg.price,
            type: 'PACKAGE',
            details: treatmentNames
        };
        setCart([...cart, newItem]);
    };

    const removeFromCart = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const processTransaction = () => {
        const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

        const transactionData = {
            id: initialData ? initialData.id : Date.now(),
            time: initialData ? initialData.time : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            customer: customerName,
            service: cart.map(item => item.type === 'PACKAGE' ? `[PAKET] ${item.name}` : item.name).join(", "),
            amount: totalPrice,
            status: "LUNAS",
            items: cart
        };
        onSubmit(transactionData);
        onClose();
    };

    const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {
                        width: { xs: '100%', sm: 600 },
                        p: 0,
                        display: 'flex',
                        flexDirection: 'column',
                    }
                }
            }}
        >
            <Box sx={{ p: 3, pb: 2, bgcolor: 'background.paper', borderBottom: '1px solid #eee', flexShrink: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" fontWeight="bold">
                        {initialData ? "Edit Transaksi" : "Transaksi Baru"}
                    </Typography>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 3, py: 2 }}>

                <Stack spacing={2} sx={{ mb: 3 }}>
                    <TextField
                        label="Nama Pelanggan"
                        fullWidth
                        size="small"
                        variant="outlined"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Contoh: Bu Siti"
                    />
                    <TextField
                        select
                        label="Stylist / Pegawai"
                        fullWidth
                        size="small"
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                    >
                        {MOCK_EMPLOYEES.map((emp) => (
                            <MenuItem key={emp.id} value={emp.name}>
                                {emp.name}
                            </MenuItem>
                        ))}
                    </TextField>
                </Stack>

                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                    Pilih Menu:
                </Typography>

                <Paper variant="outlined" sx={{
                    height: '50vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    mb: 3,
                    borderRadius: 2
                }}>
                    <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs
                            value={tabValue}
                            onChange={(_, v) => setTabValue(v)}
                            variant="fullWidth"
                            indicatorColor="primary"
                            textColor="primary"
                        >
                            <Tab icon={<SpaIcon fontSize="small" />} iconPosition="start" label="Layanan" />
                            <Tab icon={<PackageIcon fontSize="small" />} iconPosition="start" label="Paket" />
                        </Tabs>

                        {tabValue === 0 && (
                            <Box sx={{ p: 1, bgcolor: '#f9f9f9', borderTop: '1px solid #eee' }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Cari layanan..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" color="action" />
                                            </InputAdornment>
                                        ),
                                        style: { fontSize: '0.9rem', backgroundColor: 'white' }
                                    }}
                                />
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        {tabValue === 0 && (
                            <List dense sx={{ py: 0 }}>
                                {filteredTreatments.map((item) => (
                                    <ListItem
                                        key={`t-${item.id}`}
                                        button
                                        divider
                                        onClick={() => addTreatmentToCart(item)}
                                    >
                                        <ListItemText
                                            primary={item.title}
                                            secondary={`Rp ${item.prices[0].toLocaleString('id-ID')}`}
                                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                        />
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); addTreatmentToCart(item); }}>
                                            <CloseIcon sx={{ transform: 'rotate(45deg)' }} fontSize="small" color="primary" />
                                        </IconButton>
                                    </ListItem>
                                ))}
                                {filteredTreatments.length === 0 && (
                                    <Box sx={{ p: 4, textAlign: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">Layanan tidak ditemukan</Typography>
                                    </Box>
                                )}
                            </List>
                        )}

                        {tabValue === 1 && (
                            <List dense sx={{ py: 0 }}>
                                {MOCK_PACKAGES.map((pkg) => (
                                    <ListItem
                                        key={`p-${pkg.id}`}
                                        button
                                        divider
                                        onClick={() => addPackageToCart(pkg)}
                                        alignItems="flex-start"
                                    >
                                        <ListItemText
                                            primary={pkg.title}
                                            primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold', color: 'primary.main' }}
                                            secondary={
                                                <>
                                                    <Typography component="span" variant="caption" display="block" color="text.primary" fontWeight="bold">
                                                        Rp {pkg.price.toLocaleString('id-ID')}
                                                    </Typography>
                                                    <Typography component="span" variant="caption" color="text.secondary">
                                                        Isi: {pkg.treatments.map(t => t.title).join(", ")}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); addPackageToCart(pkg); }} sx={{ mt: 1 }}>
                                            <CloseIcon sx={{ transform: 'rotate(45deg)' }} fontSize="small" color="secondary" />
                                        </IconButton>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>
                </Paper>

                <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                        bgcolor: '#f8fafc',
                        p: 2,
                        borderRadius: 2,
                        border: '1px solid #e2e8f0',
                        mb: 2
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CartIcon color="action" fontSize="small" />
                        <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
                            Ringkasan Pesanan
                        </Typography>
                    </Box>

                    <Box sx={{ bgcolor: 'white', borderRadius: 1, border: '1px dashed #ddd' }}>
                        {cart.length === 0 ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, opacity: 0.5 }}>
                                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                    Keranjang kosong
                                </Typography>
                            </Box>
                        ) : (
                            <List dense disablePadding>
                                {cart.map((item, index) => (
                                    <ListItem
                                        key={index}
                                        sx={{ py: 1, borderBottom: '1px solid #f0f0f0' }}
                                    >
                                        <Box sx={{ flexGrow: 1, width: '60%' }}>
                                            <Typography variant="body2" fontWeight={item.type === 'PACKAGE' ? 'bold' : 'normal'} display="block">
                                                {item.name}
                                            </Typography>
                                            {item.type === 'PACKAGE' && item.details && (
                                                <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                                                    + {item.details}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Typography variant="body2" fontWeight="bold" sx={{ mx: 2 }}>
                                            {item.price.toLocaleString('id-ID')}
                                        </Typography>
                                        <IconButton size="small" color="error" onClick={() => removeFromCart(index)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>
                </Paper>
            </Box>

            <Paper
                elevation={4}
                sx={{
                    bgcolor: 'white',
                    p: 2,
                    borderTop: '1px solid #e2e8f0',
                    flexShrink: 0
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">Total:</Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                        Rp {totalPrice.toLocaleString('id-ID')}
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={cart.length === 0 || !customerName}
                    onClick={processTransaction}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold', fontSize: '1rem' }}
                >
                    {initialData ? "Simpan Perubahan" : `Proses Pembayaran (${cart.length})`}
                </Button>
            </Paper>
        </Drawer>
    );
}