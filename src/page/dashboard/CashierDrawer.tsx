import {useEffect, useMemo, useState} from "react";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
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
    Payments as PaymentsIcon,
    ReceiptLong as ReceiptIcon,
    Search as SearchIcon,
    ShoppingCart as CartIcon,
    Spa as SpaIcon
} from "@mui/icons-material";

import {
    type CartItem,
    type Customer,
    type Employee,
    type PaymentMethod,
    TransactionItem,
    type Treatment,
    type TreatmentPackage
} from "../../api/types.ts";
import {treatmentService} from "../../api/service/treatmentService.ts";
import {treatmentPackageService} from "../../api/service/treatmentPackageService.ts";
import {employeeService} from "../../api/service/employeeService.ts";
import {customerService} from "../../api/service/customerService.ts";
import toast from "react-hot-toast";
import {formatDateTime} from "../../util/date.ts";

const emptyCustomer: Customer = {
    id: null,
    name: "",
    phoneNumber: "",
    address: "",
    birthDate: "",
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
        paymentMethod: PaymentMethod;
        notes: string;
    }) => void;
}

function SectionTitle({ step, title, caption }: { step: string; title: string; caption: string }) {
    return (
        <Stack direction="row" spacing={1.25} alignItems="center">
            <Chip
                label={step}
                size="small"
                color="primary"
                sx={{ borderRadius: 1, minWidth: 34, fontWeight: 800 }}
            />
            <Box>
                <Typography variant="subtitle1" fontWeight={800} lineHeight={1.1}>
                    {title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {caption}
                </Typography>
            </Box>
        </Stack>
    );
}

export default function CashierDrawer({ open, onClose, initialData, onSubmit }: CashierDrawerProps) {
    const [customer, setCustomer] = useState<Customer>(emptyCustomer);
    const [customerPhoneNumber, setCustomerPhoneNumber] = useState("");
    const [customerBirthDate, setCustomerBirthDate] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
    const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
    const [discountValue, setDiscountValue] = useState("");
    const [notes, setNotes] = useState("");
    const [customerSearch, setCustomerSearch] = useState("");
    const [selectedTreatmentPrices, setSelectedTreatmentPrices] = useState<Record<number, string>>({});
    const [confirmOpen, setConfirmOpen] = useState(false);


    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [packages, setPackages] = useState<TreatmentPackage[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [resTreatments, resPackages, resEmployees, resCustomers] = await Promise.all([
                    treatmentService.getAll(),
                    treatmentPackageService.getAll(),
                    employeeService.getAll(),
                    customerService.getAll()
                ]);

                if (resTreatments?.success && Array.isArray(resTreatments.data)) {
                    setTreatments(resTreatments.data);
                }

                if (resPackages?.success && Array.isArray(resPackages.data)) {
                    setPackages(resPackages.data);
                }

                if (resEmployees?.success && Array.isArray(resEmployees.data)) {
                    setEmployees(resEmployees.data);
                }

                if (resCustomers?.success && Array.isArray(resCustomers.data)) {
                    setCustomers(resCustomers.data);
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
                setCustomerPhoneNumber(initialData.customer?.phoneNumber || "");
                setCustomerBirthDate(initialData.customer?.birthDate || "");
                setCart(initialData.items || []);
                setSelectedEmployee(initialData.employee || null);
                setPaymentMethod(initialData.originalRecord?.paymentMethod || "CASH");
                setDiscountType("AMOUNT");
                setDiscountValue("");
                setNotes(initialData.originalRecord?.notes || "");
                setCustomerSearch(initialData.customer?.name || "");
                setConfirmOpen(false);
            } else {
                setCustomer(emptyCustomer);
                setSelectedEmployee(null);
                setCart([]);
                setTabValue(0);
                setSearchTerm("");
                setCustomerPhoneNumber("");
                setCustomerBirthDate("");
                setPaymentMethod("CASH");
                setDiscountType("AMOUNT");
                setDiscountValue("");
                setNotes("");
                setCustomerSearch("");
                setSelectedTreatmentPrices({});
                setConfirmOpen(false);
            }
        }
    }, [open, initialData]);

    const customerSuggestions = useMemo(() => {
        const nameKeyword = customerSearch.trim().toLowerCase();
        const phoneKeyword = customerPhoneNumber.trim().toLowerCase();
        const birthDateKeyword = customerBirthDate.trim();

        if (!nameKeyword && !phoneKeyword && !birthDateKeyword) return customers.slice(0, 5);

        return customers
            .filter((item) =>
                (nameKeyword && item.name.toLowerCase().includes(nameKeyword)) ||
                (phoneKeyword && item.phoneNumber.toLowerCase().includes(phoneKeyword)) ||
                (birthDateKeyword && (item.birthDate || "").includes(birthDateKeyword))
            )
            .sort((a, b) => {
                if (!birthDateKeyword) return 0;
                const aExact = a.birthDate === birthDateKeyword ? 1 : 0;
                const bExact = b.birthDate === birthDateKeyword ? 1 : 0;
                return bExact - aExact;
            })
            .slice(0, 5);
    }, [customerSearch, customerPhoneNumber, customerBirthDate, customers]);

    const categoryOptions = useMemo(() => {
        const titles = new Set<string>();
        treatments.forEach((t) => {
            if (t.category?.title) titles.add(t.category.title);
        });
        packages.forEach((p) => {
            if (p.category?.title) titles.add(p.category.title);
        });
        return ["All", ...Array.from(titles)];
    }, [treatments, packages]);

    const filteredTreatments = useMemo(() => {
        let list = treatments;
        if (categoryFilter !== "All") {
            list = list.filter((t) => t.category?.title === categoryFilter);
        }
        if (!searchTerm) return list;
        return list.filter((t) => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, treatments, categoryFilter]);

    const filteredPackages = useMemo(() => {
        let list = packages;
        if (categoryFilter !== "All") {
            list = list.filter((p) => p.category?.title === categoryFilter);
        }
        if (!searchTerm) return list;
        return list.filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, packages, categoryFilter]);

    const formatCurrency = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

    const formatPrice = (prices: number[]) => {
        if (prices.length === 0) return "-";
        if (prices.length === 1) return formatCurrency(prices[0]);
        const sorted = [...prices].sort((a, b) => a - b);
        return `${formatCurrency(sorted[0])} - ${formatCurrency(sorted[sorted.length - 1])}`;
    };

    const getTreatmentPriceValue = (item: Treatment) => {
        const selected = selectedTreatmentPrices[item.id];
        const parsed = Number(selected);
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;

        return item.prices[0] || 0;
    };

    const getPriceHelper = (item: Treatment) => {
        if (item.priceType === "Range" && item.prices.length >= 2) {
            return `Rentang ${formatPrice(item.prices)}`;
        }

        if (item.priceType === "Option" && item.prices.length > 1) {
            return "Pilih nominal sesuai layanan";
        }

        return formatPrice(item.prices);
    };

    const selectCustomer = (selected: Customer) => {
        setCustomer(selected);
        setCustomerSearch(selected.name);
        setCustomerPhoneNumber(selected.phoneNumber || "");
        setCustomerBirthDate(selected.birthDate || "");
    };

    const addTreatmentToCart = (item: Treatment) => {
        const price = getTreatmentPriceValue(item);
        if (price <= 0) {
            toast.error("Harga layanan harus lebih dari 0.");
            return;
        }

        const newItem: CartItem = {
            id: item.id,
            name: item.title,
            price,
            treatmentType: 'Single',
            priceLabel: item.priceType
        };
        setCart([...cart, newItem]);
    };

    const addPackageToCart = (pkg: TreatmentPackage) => {
        const treatmentNames = pkg.treatments.map(t => t.title).join(", ");

        const newItem: CartItem = {
            id: pkg.id,
            name: pkg.title,
            price: pkg.price,
            treatmentType: 'Package',
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

        if (!customer.name.trim()) {
            toast.error("Nama pelanggan wajib diisi.");
            return;
        }

        if (cart.length === 0) {
            toast.error("Pilih minimal satu layanan.");
            return;
        }

        setConfirmOpen(true);
    };

    const submitTransaction = () => {
        if (!selectedEmployee) return;

        const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
        const discountNumeric = Math.max(0, Number(discountValue) || 0);
        const discountAmount = discountType === "PERCENT"
            ? Math.min(subtotal, subtotal * Math.min(discountNumeric, 100) / 100)
            : Math.min(subtotal, discountNumeric);
        const totalDue = Math.max(0, subtotal - discountAmount);

        const transactionData = {
            id: initialData ? initialData.id : Date.now(),
            time: initialData ? initialData.time : formatDateTime(new Date()),
            customer: {
                ...customer,
                phoneNumber: customerPhoneNumber,
                birthDate: customerBirthDate || null
            },
            service: cart.map(item => item.treatmentType === 'Package' ? `[PAKET] ${item.name}` : item.name).join(", "),
            amount: totalDue,
            status: "LUNAS",
            items: cart,
            employee: selectedEmployee,
            paymentMethod,
            notes
        };

        onSubmit(transactionData);
        setConfirmOpen(false);
        onClose();
    };


    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const discountNumeric = Math.max(0, Number(discountValue) || 0);
    const discountAmount = discountType === "PERCENT"
        ? Math.min(subtotal, subtotal * Math.min(discountNumeric, 100) / 100)
        : Math.min(subtotal, discountNumeric);
    const totalDue = Math.max(0, subtotal - discountAmount);

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {
                        width: { xs: "100%", md: 960 },
                        p: 0,
                        display: 'flex',
                        flexDirection: 'column',
                    }
                }
            }}
        >
            <Box
                sx={{
                    px: 2.5,
                    py: 1.5,
                    bgcolor: "primary.dark",
                    color: "primary.contrastText",
                    borderBottom: "1px solid rgba(255,255,255,0.16)",
                    flexShrink: 0
                }}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                            <ReceiptIcon fontSize="small" />
                            <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.78)", letterSpacing: 0 }}>
                                Kasir Salon
                            </Typography>
                        </Stack>
                        <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.1 }}>
                            {initialData ? "Edit Transaksi" : "Transaksi Baru"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.78)", mt: 0.25, display: "block" }}>
                            {initialData ? "Perbarui detail transaksi dan total pembayaran." : "Isi data pelanggan, pilih layanan, lalu proses pembayaran."}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} sx={{ color: "primary.contrastText", bgcolor: "rgba(255,255,255,0.12)" }}>
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 3, py: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, gap: 2 }}>
                    <Stack spacing={2.5}>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 1,
                                borderColor: "rgba(180, 123, 76, 0.24)",
                                bgcolor: "rgba(255, 250, 245, 0.92)"
                            }}
                        >
                            <Stack spacing={1.5}>
                                <SectionTitle
                                    step="1"
                                    title="Identitas Member"
                                    caption="Isi pelanggan baru atau pilih member lama."
                                />
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                        gap: 2
                                    }}
                                >
                                    <TextField
                                        label="Cari / Nama Pelanggan"
                                        fullWidth
                                        size="small"
                                        variant="outlined"
                                        value={customerSearch}
                                        placeholder="Contoh: Aisyah"
                                        onChange={(e) => {
                                            const csName = e.target.value;
                                            setCustomerSearch(csName);
                                            setCustomer({
                                                ...emptyCustomer,
                                                name: csName
                                            });
                                        }}
                                        helperText={customer.id ? `Pelanggan lama #${customer.id}` : "Ketik nama baru atau pilih pelanggan lama"}
                                    />
                                    <TextField
                                        label="No Telp Pelanggan"
                                        fullWidth
                                        size="small"
                                        variant="outlined"
                                        type="number"
                                        value={customerPhoneNumber}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setCustomerPhoneNumber(value);
                                            setCustomer({
                                                ...customer,
                                                phoneNumber: value
                                            });
                                        }}
                                        placeholder="Contoh: 0851xxxxxxx"
                                    />
                                    <TextField
                                        label="Tanggal Lahir"
                                        fullWidth
                                        size="small"
                                        variant="outlined"
                                        type="date"
                                        value={customerBirthDate}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setCustomerBirthDate(value);
                                            setCustomer({
                                                ...customer,
                                                birthDate: value || null
                                            });
                                        }}
                                        InputLabelProps={{ shrink: true }}
                                        helperText="Bisa dipakai untuk cari member lama"
                                    />
                                    {(customerSearch.trim().length > 0 || customerPhoneNumber.trim().length > 0 || customerBirthDate.trim().length > 0) && customerSuggestions.length > 0 && (
                                        <Box sx={{ gridColumn: "1 / -1" }}>
                                            <Stack spacing={1}>
                                                {customerSuggestions.map((item) => (
                                                    <Paper
                                                        key={item.id}
                                                        variant="outlined"
                                                        sx={{
                                                            px: 1.25,
                                                            py: 1,
                                                            borderRadius: 1,
                                                            bgcolor: customer.id === item.id ? "rgba(180, 123, 76, 0.12)" : "background.paper",
                                                            borderColor: customer.id === item.id ? "primary.main" : "divider",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            gap: 1
                                                        }}
                                                    >
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography variant="body2" fontWeight={600} noWrap>
                                                                {item.name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                                {item.phoneNumber || "-"} | Lahir: {item.birthDate || "-"} | {item.totalVisitCount} kunjungan
                                                            </Typography>
                                                        </Box>
                                                        <Button
                                                            size="small"
                                                            variant={customer.id === item.id ? "contained" : "outlined"}
                                                            disabled={customer.id === item.id}
                                                            onClick={() => selectCustomer(item)}
                                                        >
                                                            {customer.id === item.id ? "Terpakai" : "Pakai"}
                                                        </Button>
                                                    </Paper>
                                                ))}
                                            </Stack>
                                        </Box>
                                    )}
                                </Box>
                            </Stack>
                        </Paper>

                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 1,
                                borderColor: "rgba(180, 123, 76, 0.24)",
                                bgcolor: "rgba(255, 250, 245, 0.92)"
                            }}
                        >
                            <Stack spacing={1.5}>
                                <SectionTitle
                                    step="2"
                                    title="Pembayaran"
                                    caption="Pilih stylist, metode bayar, diskon, dan catatan transaksi."
                                />
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                                        gap: 2
                                    }}
                                >
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
                                    <TextField
                                        select
                                        label="Metode Bayar"
                                        fullWidth
                                        size="small"
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                    >
                                        <MenuItem value="CASH">CASH</MenuItem>
                                        <MenuItem value="TRANSFER">TRANSFER</MenuItem>
                                        <MenuItem value="QRIS">QRIS</MenuItem>
                                    </TextField>
                                    <TextField
                                        select
                                        label="Tipe Diskon"
                                        fullWidth
                                        size="small"
                                        value={discountType}
                                        onChange={(e) => setDiscountType(e.target.value as "AMOUNT" | "PERCENT")}
                                    >
                                        <MenuItem value="AMOUNT">Nominal</MenuItem>
                                        <MenuItem value="PERCENT">Persen</MenuItem>
                                    </TextField>
                                    <TextField
                                        label={discountType === "AMOUNT" ? "Diskon (Rp)" : "Diskon (%)"}
                                        fullWidth
                                        size="small"
                                        variant="outlined"
                                        type="number"
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(e.target.value)}
                                        placeholder={discountType === "AMOUNT" ? "Contoh: 10000" : "Contoh: 10"}
                                        helperText={discountType === "AMOUNT" ? "Diskon akan mengurangi total" : "Maksimal 100%"}
                                    />
                                    <TextField
                                        label="Catatan"
                                        fullWidth
                                        size="small"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Opsional: request pelanggan, kondisi layanan, dll."
                                        sx={{ gridColumn: "1 / -1" }}
                                        multiline
                                        minRows={2}
                                    />
                                </Box>
                            </Stack>
                        </Paper>

                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 1,
                                borderColor: "rgba(196, 112, 93, 0.24)",
                                bgcolor: "background.paper"
                            }}
                        >
                            <Stack spacing={2}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <SectionTitle
                                        step="3"
                                        title="Pilih Layanan"
                                        caption="Tambah treatment atau paket ke keranjang."
                                    />
                                    <Chip label={`${cart.length} item`} size="small" color={cart.length > 0 ? "primary" : "default"} />
                                </Stack>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <TextField
                                        select
                                        size="small"
                                        label="Kategori"
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        sx={{ minWidth: 180 }}
                                    >
                                        {categoryOptions.map((category) => (
                                            <MenuItem key={category} value={category}>
                                                {category}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder="Cari layanan atau paket..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon fontSize="small" color="action" />
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Stack>
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

                                <Paper
                                    variant="outlined"
                                    sx={{
                                        height: 420,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden',
                                        borderRadius: 1
                                    }}
                                >
                                    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                                        {loading ? (
                                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                                <CircularProgress />
                                            </Box>
                                        ) : (
                                            <List dense sx={{ py: 0 }}>
                                                {tabValue === 0 && (
                                                    <>
                                                        {filteredTreatments.map((item) => (
                                                            <ListItem
                                                                key={`t-${item.id}`}
                                                                sx={{
                                                                    px: 1.5,
                                                                    py: 1.2,
                                                                    m: 1,
                                                                    width: "auto",
                                                                    border: '1px solid #f0e6dc',
                                                                    borderRadius: 1,
                                                                    bgcolor: "rgba(255, 250, 245, 0.72)",
                                                                    alignItems: 'flex-start',
                                                                    transition: "background-color 160ms ease, border-color 160ms ease",
                                                                    "&:hover": {
                                                                        bgcolor: "rgba(180, 123, 76, 0.08)",
                                                                        borderColor: "rgba(180, 123, 76, 0.38)"
                                                                    }
                                                                }}
                                                                secondaryAction={
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        onClick={() => addTreatmentToCart(item)}
                                                                    >
                                                                        Tambah
                                                                    </Button>
                                                                }
                                                            >
                                                                <Box sx={{ pr: 11, width: "100%" }}>
                                                                    <ListItemText
                                                                        primary={item.title}
                                                                        secondary={getPriceHelper(item)}
                                                                        primaryTypographyProps={{
                                                                            variant: 'body2',
                                                                            fontWeight: 600,
                                                                            sx: {
                                                                                display: '-webkit-box',
                                                                                WebkitLineClamp: 2,
                                                                                WebkitBoxOrient: 'vertical',
                                                                                overflow: 'hidden'
                                                                            }
                                                                        }}
                                                                        secondaryTypographyProps={{
                                                                            sx: { color: 'text.secondary' }
                                                                        }}
                                                                    />
                                                                    {item.prices.length > 1 && (
                                                                        <TextField
                                                                            select={item.priceType === "Option"}
                                                                            size="small"
                                                                            label="Harga final"
                                                                            type={item.priceType === "Option" ? undefined : "number"}
                                                                            value={selectedTreatmentPrices[item.id] ?? String(item.prices[0] || 0)}
                                                                            onChange={(e) => setSelectedTreatmentPrices((prev) => ({
                                                                                ...prev,
                                                                                [item.id]: e.target.value
                                                                            }))}
                                                                            sx={{ mt: 1, maxWidth: 220 }}
                                                                        >
                                                                            {item.priceType === "Option" && item.prices.map((price) => (
                                                                                <MenuItem key={price} value={String(price)}>
                                                                                    {formatCurrency(price)}
                                                                                </MenuItem>
                                                                            ))}
                                                                        </TextField>
                                                                    )}
                                                                </Box>
                                                            </ListItem>
                                                        ))}
                                                        {filteredTreatments.length === 0 && (
                                                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                                                <Typography variant="caption" color="text.secondary">Layanan tidak ditemukan</Typography>
                                                            </Box>
                                                        )}
                                                    </>
                                                )}
                                                {tabValue === 1 && (
                                                    <>
                                                        {filteredPackages.map((pkg) => (
                                                            <ListItem
                                                                key={`p-${pkg.id}`}
                                                                alignItems="flex-start"
                                                                sx={{
                                                                    px: 1.5,
                                                                    py: 1.2,
                                                                    m: 1,
                                                                    width: "auto",
                                                                    border: '1px solid #f0e6dc',
                                                                    borderRadius: 1,
                                                                    bgcolor: "rgba(255, 250, 245, 0.72)",
                                                                    transition: "background-color 160ms ease, border-color 160ms ease",
                                                                    "&:hover": {
                                                                        bgcolor: "rgba(196, 112, 93, 0.08)",
                                                                        borderColor: "rgba(196, 112, 93, 0.38)"
                                                                    }
                                                                }}
                                                                secondaryAction={
                                                                    <Button
                                                                        size="small"
                                                                        variant="outlined"
                                                                        onClick={() => addPackageToCart(pkg)}
                                                                    >
                                                                        Tambah
                                                                    </Button>
                                                                }
                                                            >
                                                                <ListItemText
                                                                    primary={pkg.title}
                                                                    primaryTypographyProps={{
                                                                        variant: 'body2',
                                                                        fontWeight: 600,
                                                                        sx: {
                                                                            display: '-webkit-box',
                                                                            WebkitLineClamp: 2,
                                                                            WebkitBoxOrient: 'vertical',
                                                                            overflow: 'hidden'
                                                                        }
                                                                    }}
                                                                    secondary={
                                                                        <>
                                                                            <Typography component="span" variant="caption" display="block" color="text.primary" fontWeight="bold">
                                                                                Rp {pkg.price.toLocaleString('id-ID')}
                                                                            </Typography>
                                                                            <Typography component="span" variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                                                Isi: {pkg.treatments.map(t => t.title).join(", ")}
                                                                            </Typography>
                                                                        </>
                                                                    }
                                                                />
                                                            </ListItem>
                                                        ))}
                                                        {filteredPackages.length === 0 && (
                                                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                                                <Typography variant="caption" color="text.secondary">Paket tidak ditemukan</Typography>
                                                            </Box>
                                                        )}
                                                    </>
                                                )}
                                            </List>
                                        )}
                                    </Box>
                                </Paper>
                            </Stack>
                        </Paper>
                    </Stack>

                    <Paper
                        elevation={0}
                        variant="outlined"
                        sx={{
                            bgcolor: 'rgba(255, 246, 237, 0.98)',
                            p: 2,
                            borderRadius: 1,
                            border: '1px solid rgba(180, 123, 76, 0.34)',
                            boxShadow: "0 14px 32px rgba(60, 47, 42, 0.10)",
                            height: 'fit-content',
                            position: 'sticky',
                            top: 16
                        }}
                    >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <CartIcon color="primary" fontSize="small" />
                                <Typography variant="subtitle2" fontWeight={800}>
                                    Ringkasan Pesanan
                                </Typography>
                            </Stack>
                            <Chip label={paymentMethod} size="small" variant="outlined" icon={<PaymentsIcon />} />
                        </Stack>
                        <Box sx={{ bgcolor: 'white', borderRadius: 1, border: '1px dashed #d8bda7', mb: 2, overflow: "hidden" }}>
                            {cart.length === 0 ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, opacity: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                        Keranjang kosong
                                    </Typography>
                                </Box>
                            ) : (
                                <List dense disablePadding>
                                    {cart.map((item, index) => (
                                        <ListItem
                                            key={index}
                                            sx={{ py: 1, borderBottom: '1px solid #f0e6dc', alignItems: "flex-start" }}
                                        >
                                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={item.treatmentType === 'Package' ? 'bold' : 'normal'}
                                                    sx={{
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {item.name}
                                                </Typography>
                                                {item.treatmentType === 'Package' && item.details && (
                                                    <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                                                        + {item.details}
                                                    </Typography>
                                                )}
                                                {item.treatmentType === "Single" && item.priceLabel && item.priceLabel !== "Fixed" && (
                                                    <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                                                        Harga {item.priceLabel}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Typography variant="body2" fontWeight="bold" sx={{ mx: 1 }}>
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

                        <Stack spacing={1.2}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                                <Typography variant="body2" fontWeight="bold">{formatCurrency(subtotal)}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="text.secondary">Diskon</Typography>
                                <Typography variant="body2" fontWeight="bold">-{formatCurrency(discountAmount)}</Typography>
                            </Stack>
                            <Divider />
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ bgcolor: "rgba(180, 123, 76, 0.10)", p: 1.25, borderRadius: 1 }}
                            >
                                <Typography variant="subtitle1" fontWeight={800}>Total</Typography>
                                <Typography variant="h5" fontWeight={900} color="primary.main">
                                    {formatCurrency(totalDue)}
                                </Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                                Metode bayar: {paymentMethod} | Pastikan data pelanggan sudah benar.
                            </Typography>
                        </Stack>

                        <Button
                            variant="contained"
                            fullWidth
                            size="large"
                            disabled={cart.length === 0 || !customer.name || !selectedEmployee}
                            onClick={processTransaction}
                            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 'bold', fontSize: '1rem', mt: 2 }}
                        >
                            {initialData ? "Simpan Perubahan" : `Proses Pembayaran (${cart.length})`}
                        </Button>
                    </Paper>
                </Box>
            </Box>

            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
                <DialogContent>
                    <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">Pelanggan</Typography>
                            <Typography variant="body2" fontWeight={600}>{customer.name || "-"}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">Stylist</Typography>
                            <Typography variant="body2" fontWeight={600}>{selectedEmployee?.name || "-"}</Typography>
                        </Stack>
                        <Divider />
                        <Stack spacing={0.75}>
                            {cart.map((item, index) => (
                                <Stack key={`${item.treatmentType}-${item.id}-${index}`} direction="row" justifyContent="space-between" gap={2}>
                                    <Typography variant="body2" sx={{ minWidth: 0 }}>
                                        {item.treatmentType === "Package" ? `[PAKET] ${item.name}` : item.name}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: "nowrap" }}>
                                        {formatCurrency(item.price)}
                                    </Typography>
                                </Stack>
                            ))}
                        </Stack>
                        <Divider />
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                            <Typography variant="body2">{formatCurrency(subtotal)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">Diskon</Typography>
                            <Typography variant="body2">-{formatCurrency(discountAmount)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="subtitle1" fontWeight={700}>Total Bayar</Typography>
                            <Typography variant="subtitle1" fontWeight={700} color="primary.main">{formatCurrency(totalDue)}</Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            Metode bayar: {paymentMethod}
                        </Typography>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cek Lagi</Button>
                    <Button variant="contained" onClick={submitTransaction}>
                        Simpan Transaksi
                    </Button>
                </DialogActions>
            </Dialog>
        </Drawer>
    );
}

