import {useEffect, useMemo, useState} from "react";
import {
    Box,
    Button,
    CircularProgress,
    Drawer,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Paper,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography
} from "@mui/material";
import {
    Close as CloseIcon,
    Delete as DeleteIcon,
    Inventory as PackageIcon,
    Search as SearchIcon,
    ShoppingCart as CartIcon,
    Spa as SpaIcon
} from "@mui/icons-material";

import {
    type CartItem,
    type Customer,
    type Employee,
    TransactionItem,
    type Treatment,
    type TreatmentPackage
} from "../../api/types.ts";
import {treatmentService} from "../../api/service/treatmentService.ts";
import {treatmentPackageService} from "../../api/service/treatmentPackageService.ts";
import {employeeService} from "../../api/service/employeeService.ts";
import toast from "react-hot-toast";
import {formatDateTime} from "../../util/date.ts";

const emptyCustomer: Customer = {
    id: null,
    name: "",
    phoneNumber: "",
    address: "",
    visitCount: 0,
    totalVisitCount: 0,
    lastVisitDate: ""
};

interface CashierDrawerProps {
    open: boolean;
    onClose: () => void;
    initialData?: TransactionItem | null;
    onSubmit: (transactionData: {
        id: number;
        time: string;
        service: string;
        amount: number;
        status: string;
        customer: Customer;
        employee: Employee;
        items: CartItem[]
    }) => void;
}

export default function CashierDrawer({ open, onClose, initialData, onSubmit }: CashierDrawerProps) {
    const [customer, setCustomer] = useState<Customer>(emptyCustomer);
    const [customerPhoneNumber, setCustomerPhoneNumber] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");


    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [packages, setPackages] = useState<TreatmentPackage[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [resTreatments, resPackages, resEmployees] = await Promise.all([
                    treatmentService.getAll(),
                    treatmentPackageService.getAll(),
                    employeeService.getAll()
                ]);

                console.log("Fetched data: ", resTreatments, resPackages, resEmployees);

                if (resTreatments?.success && Array.isArray(resTreatments.data)) {
                    setTreatments(resTreatments.data);
                    console.log("Treatments data: ", resTreatments.data);
                }

                if (resPackages?.success && Array.isArray(resPackages.data)) {
                    setPackages(resPackages.data);
                    console.log("Packages data: ", resPackages.data);
                }

                if (resEmployees?.success && Array.isArray(resEmployees.data)) {
                    setEmployees(resEmployees.data);
                    console.log("Employees data: ", resEmployees.data);
                }
            } catch (error) {
                console.error("Failed to fetch data: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setCustomer(initialData.customer);
                setCart(initialData.items || []);
            } else {
                setCustomer(emptyCustomer);
                setSelectedEmployee(null);
                setCart([]);
                setTabValue(0);
                setSearchTerm("");
            }
        }
    }, [open, initialData]);

    const filteredTreatments = useMemo(() => {
        if (!searchTerm) return treatments;
        return treatments.filter(t =>
            t.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, treatments]);

    const addTreatmentToCart = (item: Treatment) => {
        const newItem: CartItem = {
            id: item.id,
            name: item.title,
            price: item.prices[0],
            type: 'TREATMENT'
        };
        setCart([...cart, newItem]);
    };

    const addPackageToCart = (pkg: TreatmentPackage) => {
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
        if (!selectedEmployee) {
            toast.error("Pilih stylist dulu!");
            return;
        }

        const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

        const transactionData = {
            id: initialData ? initialData.id : Date.now(),
            time: initialData ? initialData.time : formatDateTime(new Date()),
            customer: customer,
            service: cart.map(item => item.type === 'PACKAGE' ? `[PAKET] ${item.name}` : item.name).join(", "),
            amount: totalPrice,
            status: "LUNAS",
            items: cart,
            employee: selectedEmployee
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
                        value={customer.name || ""}
                        placeholder="Contoh: Yang Ruikee 💖"
                        onChange={(e) => {
                            const csName = e.target.value;

                            setCustomer({
                                ...customer,
                                name: csName
                            });
                        }}
                    />
                    <TextField
                        label="No Telp Pelanggan"
                        fullWidth
                        size="small"
                        variant="outlined"
                        type="number"
                        value={customerPhoneNumber}
                        onChange={(e) => setCustomerPhoneNumber(e.target.value)}
                        placeholder="Contoh: 085156988228"
                    />
                    <TextField
                        select
                        label="Stylist"
                        fullWidth={true}
                        size="small"
                        value={selectedEmployee?.id ?? ""}
                        onChange={(e) => {
                            const empId = Number(e.target.value);
                            const emp = employees.find((emp) => emp.id === empId) || null;
                            setSelectedEmployee(emp);
                        }}
                    >
                        {employees.map((emp) => (
                            <MenuItem key={emp.id} value={emp.id}>
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
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <>
                                {tabValue === 0 && (
                                    <List dense sx={{ py: 0 }}>
                                        {filteredTreatments.map((item) => (
                                            <ListItem
                                                key={`t-${item.id}`}
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
                                        {packages.map((pkg) => (
                                            <ListItem
                                                key={`p-${pkg.id}`}
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
                            </>
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
                    disabled={cart.length === 0 || !customer.name || !selectedEmployee}
                    onClick={processTransaction}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold', fontSize: '1rem' }}
                >
                    {initialData ? "Simpan Perubahan" : `Proses Pembayaran (${cart.length})`}
                </Button>
            </Paper>
        </Drawer>
    );
}