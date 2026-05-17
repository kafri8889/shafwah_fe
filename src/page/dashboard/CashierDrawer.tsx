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
    Add as AddIcon,
    CardGiftcard as VoucherIcon,
    Close as CloseIcon,
    Delete as DeleteIcon,
    Inventory as PackageIcon,
    Payments as PaymentsIcon,
    ReceiptLong as ReceiptIcon,
    Search as SearchIcon,
    Spa as SpaIcon
} from "@mui/icons-material";

import {
    type CartItem,
    type Customer,
    type Employee,
    type MemberVoucher,
    type PaymentMethod,
    TransactionItem,
    type Treatment,
    type TreatmentPackage
} from "../../api/types.ts";
import {treatmentService} from "../../api/service/treatmentService.ts";
import {treatmentPackageService} from "../../api/service/treatmentPackageService.ts";
import {employeeService} from "../../api/service/employeeService.ts";
import {customerService} from "../../api/service/customerService.ts";
import {voucherService} from "../../api/service/voucherService.ts";
import toast from "react-hot-toast";
import {isAdminUser} from "../../util/auth.ts";

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

const LEGACY_CUSTOMER_NAME = "Pelanggan Umum / Non Member";

type LegacyBookRow = {
    id: number;
    employeeId: number | "";
    commissionPercent: 5 | 10 | 15;
    amount: string;
};

const createLegacyBookRow = (employeeId: number | "" = "", commissionPercent: 5 | 10 | 15 = 10): LegacyBookRow => ({
    id: Date.now() + Math.floor(Math.random() * 1000),
    employeeId,
    commissionPercent,
    amount: ""
});

function formatDateTimeLocalInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
}

function parseDateTimeLocal(value: string) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toApiDateTime(value: string) {
    if (!value) return `${formatDateTimeLocalInput(new Date())}:00`;
    return value.length === 16 ? `${value}:00` : value;
}

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
        isLegacy?: boolean;
        legacyCommissionPercent?: number;
        memberVoucherId?: number | null;
    } | Array<{
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
        isLegacy?: boolean;
        legacyCommissionPercent?: number;
        memberVoucherId?: number | null;
    }>) => void;
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
    const isAdmin = isAdminUser();
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
    const [transactionDate, setTransactionDate] = useState(formatDateTimeLocalInput(new Date()));
    const [legacyMode, setLegacyMode] = useState(false);
    const [legacyCommissionPercent, setLegacyCommissionPercent] = useState<5 | 10 | 15>(10);
    const [legacyRows, setLegacyRows] = useState<LegacyBookRow[]>([createLegacyBookRow()]);
    const [customerSearch, setCustomerSearch] = useState("");
    const [selectedTreatmentPrices, setSelectedTreatmentPrices] = useState<Record<number, string>>({});
    const [memberVouchers, setMemberVouchers] = useState<MemberVoucher[]>([]);
    const [selectedMemberVoucherId, setSelectedMemberVoucherId] = useState<number | null>(null);
    const [voucherLoading, setVoucherLoading] = useState(false);
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
                    employeeService.getActive(),
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
                setSelectedEmployee(initialData.employee || null);
                setCart((initialData.items || []).map((item) => ({
                    ...item,
                    employee: item.employee || initialData.employee || null
                })));
                setPaymentMethod(initialData.originalRecord?.paymentMethod || "CASH");
                setDiscountType("AMOUNT");
                setDiscountValue("");
                setNotes(initialData.originalRecord?.notes || "");
                setTransactionDate(formatDateTimeLocalInput(parseDateTimeLocal(initialData.time)));
                setLegacyMode(false);
                setLegacyCommissionPercent(10);
                setLegacyRows([createLegacyBookRow(initialData.employee?.id || "")]);
                setCustomerSearch(initialData.customer?.name || "");
                setSelectedMemberVoucherId(null);
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
                setTransactionDate(formatDateTimeLocalInput(new Date()));
                setLegacyMode(false);
                setLegacyCommissionPercent(10);
                setLegacyRows([createLegacyBookRow()]);
                setCustomerSearch("");
                setSelectedTreatmentPrices({});
                setMemberVouchers([]);
                setSelectedMemberVoucherId(null);
                setConfirmOpen(false);
            }
        }
    }, [open, initialData]);

    useEffect(() => {
        if (legacyMode) {
            setMemberVouchers([]);
            setSelectedMemberVoucherId(null);
            return;
        }

        if (!customer.id) {
            setMemberVouchers([]);
            setSelectedMemberVoucherId(null);
            return;
        }

        setVoucherLoading(true);
        voucherService.getMemberVouchers(customer.id)
            .then((res) => {
                const vouchers = res.success && Array.isArray(res.data) ? res.data : [];
                setMemberVouchers(vouchers);
                setSelectedMemberVoucherId((current) => (
                    current && vouchers.some((voucher) => (
                        voucher.id === current &&
                        voucher.status !== "USED" &&
                        voucher.status !== "CANCELLED"
                    )) ? current : null
                ));
            })
            .catch((error) => {
                console.error(error);
                setMemberVouchers([]);
                setSelectedMemberVoucherId(null);
            })
            .finally(() => setVoucherLoading(false));
    }, [customer.id, legacyMode]);

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

    const formatVoucherDiscount = (voucher: MemberVoucher) => {
        if (voucher.template.discountType === "PERCENTAGE") return `${voucher.template.discountValue}%`;
        return formatCurrency(voucher.template.discountValue);
    };

    const visibleMemberVouchers = useMemo(
        () => memberVouchers.filter((voucher) => voucher.status !== "USED" && voucher.status !== "CANCELLED"),
        [memberVouchers]
    );

    const voucherNeverExpires = (voucher: MemberVoucher) => (
        voucher.neverExpires || voucher.template.neverExpires || voucher.template.validityDays < 1
    );

    const formatVoucherExpiry = (voucher: MemberVoucher) => {
        if (voucherNeverExpires(voucher)) return "Tidak kadaluarsa";
        const parsed = new Date(voucher.expiresAt);
        if (Number.isNaN(parsed.getTime())) return "-";
        return parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    };

    const voucherAppliesToCart = (voucher: MemberVoucher) => {
        if (voucher.template.appliesToAll) return true;

        return cart.some((item) => (
            (item.treatmentType === "Single" && voucher.template.treatmentIds.includes(item.id)) ||
            (item.treatmentType === "Package" && voucher.template.treatmentPackageIds.includes(item.id))
        ));
    };

    const getVoucherScopeLabel = (voucher: MemberVoucher) => {
        if (voucher.template.appliesToAll) return "Semua treatment";
        if (voucher.template.treatmentIds.length > 0) return "Treatment tertentu";
        if (voucher.template.treatmentPackageIds.length > 0) return "Paket tertentu";
        return "Belum diatur";
    };

    const getVoucherInvalidReason = (voucher: MemberVoucher, baseAmount: number) => {
        const notExpired = voucherNeverExpires(voucher) || new Date(voucher.expiresAt).getTime() >= Date.now();
        if (voucher.status !== "ACTIVE") return "Voucher tidak aktif.";
        if (!voucher.template.active) return "Template voucher sedang nonaktif.";
        if (!notExpired) return "Voucher sudah kadaluarsa.";
        if (baseAmount < voucher.template.minimumTransaction) return `Minimum transaksi ${formatCurrency(voucher.template.minimumTransaction)}.`;
        if (!voucherAppliesToCart(voucher)) return "Tambahkan treatment atau paket yang sesuai.";
        return "";
    };

    const isVoucherUsable = (voucher: MemberVoucher, baseAmount: number) => {
        const notExpired = voucherNeverExpires(voucher) || new Date(voucher.expiresAt).getTime() >= Date.now();

        return (
            voucher.status === "ACTIVE" &&
            voucher.template.active &&
            notExpired &&
            baseAmount >= voucher.template.minimumTransaction &&
            voucherAppliesToCart(voucher)
        );
    };

    const getVoucherDiscountAmount = (voucher: MemberVoucher | null, baseAmount: number) => {
        if (!voucher || !isVoucherUsable(voucher, baseAmount)) return 0;

        const amount = voucher.template.discountType === "PERCENTAGE"
            ? baseAmount * Math.min(Math.max(voucher.template.discountValue, 0), 100) / 100
            : voucher.template.discountValue;

        return Math.min(baseAmount, Math.max(0, amount));
    };

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
            employee: selectedEmployee,
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
            employee: selectedEmployee,
            details: treatmentNames
        };
        setCart([...cart, newItem]);
    };

    const updateCartItemEmployee = (index: number, employeeId: number) => {
        const employee = employees.find((emp) => emp.id === employeeId) || null;
        setCart((prev) => prev.map((item, itemIndex) => (
            itemIndex === index ? { ...item, employee } : item
        )));
    };

    const removeFromCart = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const updateLegacyRow = (rowId: number, patch: Partial<LegacyBookRow>) => {
        setLegacyRows((prev) => prev.map((row) => row.id === rowId ? { ...row, ...patch } : row));
    };

    const addLegacyRow = () => {
        setLegacyRows((prev) => [
            ...prev,
            createLegacyBookRow(selectedEmployee?.id || "", legacyCommissionPercent)
        ]);
    };

    const removeLegacyRow = (rowId: number) => {
        setLegacyRows((prev) => prev.length <= 1 ? prev : prev.filter((row) => row.id !== rowId));
    };

    const validLegacyRows = legacyRows
        .map((row) => ({
            ...row,
            amountValue: Math.max(0, Number(row.amount) || 0),
            employee: employees.find((employee) => employee.id === Number(row.employeeId)) || null
        }))
        .filter((row) => row.employee && row.amountValue > 0);

    const processTransaction = () => {
        if (!selectedEmployee && !legacyMode) {
            toast.error("Pilih stylist dulu!");
            return;
        }

        if (legacyMode) {
            if (validLegacyRows.length === 0) {
                toast.error("Isi minimal satu baris transaksi buku dengan stylist dan nominal valid.");
                return;
            }
            if (validLegacyRows.length !== legacyRows.length) {
                toast.error("Lengkapi semua baris transaksi buku atau hapus baris kosong.");
                return;
            }
            setConfirmOpen(true);
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

        if (cart.some((item) => !item.employee?.id)) {
            toast.error("Pilih stylist untuk setiap layanan.");
            return;
        }

        setConfirmOpen(true);
    };

    const submitTransaction = () => {
        if (legacyMode) {
            if (validLegacyRows.length === 0) return;

            onSubmit(validLegacyRows.map((row, index) => ({
                id: Date.now() + index,
                time: isAdmin ? toApiDateTime(transactionDate) : toApiDateTime(formatDateTimeLocalInput(new Date())),
                customer: {
                    ...emptyCustomer,
                    name: LEGACY_CUSTOMER_NAME
                },
                service: `Transaksi Buku - Komisi ${row.commissionPercent}%`,
                amount: row.amountValue,
                status: "LUNAS",
                items: [],
                employee: row.employee as Employee,
                paymentMethod,
                notes,
                isLegacy: true,
                legacyCommissionPercent: row.commissionPercent,
                memberVoucherId: null
            })));
            setConfirmOpen(false);
            onClose();
            return;
        }

        if (!selectedEmployee) return;

        const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
        const discountNumeric = Math.max(0, Number(discountValue) || 0);
        const discountAmount = discountType === "PERCENT"
            ? Math.min(subtotal, subtotal * Math.min(discountNumeric, 100) / 100)
            : Math.min(subtotal, discountNumeric);
        const totalDue = Math.max(0, subtotal - discountAmount);
        const voucherToUse = memberVouchers.find((voucher) => voucher.id === selectedMemberVoucherId) || null;

        if (voucherToUse && !isVoucherUsable(voucherToUse, totalDue)) {
            toast.error("Voucher yang dipilih tidak valid untuk transaksi ini.");
            return;
        }

        const transactionData = {
            id: initialData ? initialData.id : Date.now(),
            time: isAdmin ? toApiDateTime(transactionDate) : (initialData ? initialData.time : toApiDateTime(formatDateTimeLocalInput(new Date()))),
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
            notes,
            memberVoucherId: voucherToUse?.id ?? null
        };

        onSubmit(transactionData);
        setConfirmOpen(false);
        onClose();
    };


    const subtotal = legacyMode ? validLegacyRows.reduce((sum, row) => sum + row.amountValue, 0) : cart.reduce((sum, item) => sum + item.price, 0);
    const discountNumeric = Math.max(0, Number(discountValue) || 0);
    const discountAmount = legacyMode ? 0 : discountType === "PERCENT"
        ? Math.min(subtotal, subtotal * Math.min(discountNumeric, 100) / 100)
        : Math.min(subtotal, discountNumeric);
    const totalDue = Math.max(0, subtotal - discountAmount);
    const selectedVoucher = legacyMode ? null : memberVouchers.find((voucher) => voucher.id === selectedMemberVoucherId) || null;
    const voucherDiscountAmount = getVoucherDiscountAmount(selectedVoucher, totalDue);
    const finalTotalDue = Math.max(0, totalDue - voucherDiscountAmount);

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: {
                        width: "100vw",
                        height: "100vh",
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

            <Box sx={{ flexGrow: 1, minHeight: 0, overflow: { xs: "auto", lg: "hidden" }, px: 2, py: 2 }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: "1fr",
                            lg: "minmax(210px, 0.75fr) minmax(380px, 1.25fr) minmax(460px, 1.45fr) minmax(320px, 1fr)"
                        },
                        gridTemplateRows: { lg: "auto minmax(0, 1fr)" },
                        alignItems: "stretch",
                        height: { lg: "100%" },
                        minHeight: 0,
                        gap: 2
                    }}
                >
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            borderRadius: 1,
                            borderColor: "rgba(180, 123, 76, 0.24)",
                            bgcolor: "rgba(255, 250, 245, 0.92)",
                            gridColumn: { lg: 1 },
                            gridRow: { lg: "1 / span 2" },
                            minHeight: 0,
                            overflow: "auto"
                        }}
                    >
                        <Stack spacing={1.25}>
                            <SectionTitle
                                step="1"
                                title="Voucher"
                                caption="Pilih voucher member yang masih berlaku."
                            />
                            {legacyMode ? (
                                <Typography variant="caption" color="text.secondary">
                                    Voucher tidak dipakai untuk transaksi buku.
                                </Typography>
                            ) : !customer.id ? (
                                <Typography variant="caption" color="text.secondary">
                                    Pilih member lama untuk melihat voucher yang tersedia.
                                </Typography>
                            ) : voucherLoading ? (
                                <Typography variant="caption" color="text.secondary">
                                    Memuat voucher member...
                                </Typography>
                            ) : visibleMemberVouchers.length === 0 ? (
                                <Typography variant="caption" color="text.secondary">
                                    Tidak ada voucher aktif yang bisa ditampilkan.
                                </Typography>
                            ) : (
                                <Stack spacing={1}>
                                    {visibleMemberVouchers.map((voucher) => {
                                        const usable = isVoucherUsable(voucher, totalDue);
                                        const selected = selectedMemberVoucherId === voucher.id;
                                        const invalidReason = getVoucherInvalidReason(voucher, totalDue);
                                        return (
                                            <Paper
                                                key={voucher.id}
                                                variant="outlined"
                                                sx={{
                                                    p: 1.25,
                                                    borderRadius: 1,
                                                    borderColor: selected ? "primary.main" : "divider",
                                                    bgcolor: selected ? "rgba(180, 123, 76, 0.10)" : "background.paper"
                                                }}
                                            >
                                                <Stack spacing={1}>
                                                    <Stack direction="row" spacing={1} alignItems="flex-start">
                                                        <VoucherIcon fontSize="small" color={selected ? "primary" : "action"} />
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography variant="body2" fontWeight={800} noWrap>
                                                                {voucher.template.name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" display="block">
                                                                {formatVoucherDiscount(voucher)} | {formatVoucherExpiry(voucher)}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" display="block">
                                                                {getVoucherScopeLabel(voucher)}
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                    {!usable && invalidReason && (
                                                        <Typography variant="caption" color="error.main" fontWeight={700}>
                                                            {invalidReason}
                                                        </Typography>
                                                    )}
                                                    <Button
                                                        size="small"
                                                        fullWidth
                                                        variant={selected ? "contained" : "outlined"}
                                                        disabled={!usable}
                                                        onClick={() => setSelectedMemberVoucherId(selected ? null : voucher.id)}
                                                    >
                                                        {selected ? "Terpilih" : usable ? "Pakai" : "Tidak valid"}
                                                    </Button>
                                                </Stack>
                                            </Paper>
                                        );
                                    })}
                                </Stack>
                            )}
                        </Stack>
                    </Paper>
                    <Stack spacing={2.5} sx={{ display: { lg: "contents", xs: "flex" } }}>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 1,
                                borderColor: "rgba(196, 112, 93, 0.24)",
                                bgcolor: "background.paper",
                                gridColumn: { lg: 2 },
                                gridRow: { lg: "1 / span 2" },
                                height: { lg: "100%" },
                                minHeight: 0,
                                display: "flex",
                                flexDirection: "column"
                            }}
                        >
                            <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" flexShrink={0}>
                                    <SectionTitle
                                        step="2"
                                        title="Pilih Layanan"
                                        caption="Tambah treatment atau paket ke keranjang."
                                    />
                                    <Chip label={`${cart.length} item`} size="small" color={cart.length > 0 ? "primary" : "default"} />
                                </Stack>
                                <Stack direction="row" spacing={1.5} alignItems="center" flexShrink={0}>
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
                                    sx={{ flexShrink: 0 }}
                                >
                                    <Tab icon={<SpaIcon fontSize="small" />} iconPosition="start" label="Layanan" />
                                    <Tab icon={<PackageIcon fontSize="small" />} iconPosition="start" label="Paket" />
                                </Tabs>

                                <Paper
                                    variant="outlined"
                                    sx={{
                                        flexGrow: 1,
                                        minHeight: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden',
                                        borderRadius: 1
                                    }}
                                >
                                    <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
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

                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 1,
                                borderColor: "rgba(180, 123, 76, 0.24)",
                                bgcolor: "rgba(255, 250, 245, 0.92)",
                                gridColumn: { lg: 3 },
                                gridRow: { lg: 1 },
                                minHeight: 0,
                                overflow: "auto"
                            }}
                        >
                            <Stack spacing={1.5}>
                                <SectionTitle
                                    step="3"
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
                                bgcolor: "rgba(255, 250, 245, 0.92)",
                                gridColumn: { lg: 3 },
                                gridRow: { lg: 2 },
                                minHeight: 0,
                                overflow: "auto"
                            }}
                        >
                            <Stack spacing={1.5}>
                                <SectionTitle
                                    step="4"
                                    title="Pembayaran"
                                    caption="Pilih stylist, metode bayar, diskon, dan catatan transaksi."
                                />
                                {isAdmin && !initialData && (
                                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                                        <Button
                                            variant={legacyMode ? "contained" : "outlined"}
                                            onClick={() => {
                                                setLegacyMode((value) => !value);
                                                setSelectedMemberVoucherId(null);
                                            }}
                                            sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
                                        >
                                            {legacyMode ? "Mode Buku Lama Aktif" : "Input Transaksi Buku"}
                                        </Button>
                                        {legacyMode && (
                                            <Typography variant="caption" color="text.secondary">
                                                Customer otomatis memakai {LEGACY_CUSTOMER_NAME}; pilih stylist, tanggal, komisi, dan nominal.
                                            </Typography>
                                        )}
                                    </Stack>
                                )}
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
                                            setCart((prev) => prev.map((item) => item.employee ? item : { ...item, employee: emp }));
                                            setLegacyRows((prev) => prev.map((row) => row.employeeId ? row : { ...row, employeeId: emp?.id || "" }));
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
                                    {isAdmin && (
                                        <TextField
                                            label="Tanggal Transaksi"
                                            fullWidth
                                            size="small"
                                            type="datetime-local"
                                            value={transactionDate}
                                            onChange={(e) => setTransactionDate(e.target.value)}
                                            InputLabelProps={{ shrink: true }}
                                            helperText="Khusus admin untuk input/edit transaksi lama"
                                        />
                                    )}
                                    {legacyMode && (
                                        <Box sx={{ gridColumn: "1 / -1" }}>
                                            <Stack spacing={1.25}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={800}>
                                                            Bulk Transaksi Buku
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Satu baris akan disimpan sebagai satu transaksi buku.
                                                        </Typography>
                                                    </Box>
                                                    <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addLegacyRow}>
                                                        Tambah Baris
                                                    </Button>
                                                </Stack>
                                                <Stack spacing={1}>
                                                    {legacyRows.map((row, index) => (
                                                        <Paper key={row.id} variant="outlined" sx={{ p: 1, borderRadius: 1 }}>
                                                            <Box
                                                                sx={{
                                                                    display: "grid",
                                                                    gridTemplateColumns: { xs: "1fr", sm: "1.4fr 1fr 1fr auto" },
                                                                    gap: 1,
                                                                    alignItems: "center"
                                                                }}
                                                            >
                                                                <TextField
                                                                    select
                                                                    label={`Stylist ${index + 1}`}
                                                                    fullWidth
                                                                    size="small"
                                                                    value={row.employeeId}
                                                                    onChange={(event) => updateLegacyRow(row.id, { employeeId: Number(event.target.value) })}
                                                                >
                                                                    {employees.map((emp) => (
                                                                        <MenuItem key={emp.id} value={emp.id}>
                                                                            {emp.name}
                                                                        </MenuItem>
                                                                    ))}
                                                                </TextField>
                                                                <TextField
                                                                    select
                                                                    label="Komisi"
                                                                    fullWidth
                                                                    size="small"
                                                                    value={row.commissionPercent}
                                                                    onChange={(event) => {
                                                                        const commissionPercent = Number(event.target.value) as 5 | 10 | 15;
                                                                        setLegacyCommissionPercent(commissionPercent);
                                                                        updateLegacyRow(row.id, { commissionPercent });
                                                                    }}
                                                                >
                                                                    <MenuItem value={5}>5%</MenuItem>
                                                                    <MenuItem value={10}>10%</MenuItem>
                                                                    <MenuItem value={15}>15%</MenuItem>
                                                                </TextField>
                                                                <TextField
                                                                    label="Nominal"
                                                                    fullWidth
                                                                    size="small"
                                                                    type="number"
                                                                    value={row.amount}
                                                                    onChange={(event) => updateLegacyRow(row.id, { amount: event.target.value })}
                                                                    placeholder="Contoh: 80000"
                                                                />
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    disabled={legacyRows.length <= 1}
                                                                    onClick={() => removeLegacyRow(row.id)}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Box>
                                                        </Paper>
                                                    ))}
                                                </Stack>
                                            </Stack>
                                        </Box>
                                    )}
                                    {!legacyMode && (
                                        <>
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
                                        </>
                                    )}
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
                            height: { lg: "100%" },
                            minHeight: 0,
                            display: "flex",
                            flexDirection: "column",
                            gridColumn: { lg: 4 },
                            gridRow: { lg: "1 / span 2" }
                        }}
                    >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, flexShrink: 0 }}>
                            <SectionTitle
                                step="5"
                                title="Ringkasan"
                                caption="Cek item dan total sebelum simpan."
                            />
                            <Chip label={paymentMethod} size="small" variant="outlined" icon={<PaymentsIcon />} />
                        </Stack>
                        <Box sx={{ bgcolor: 'white', borderRadius: 1, border: '1px dashed #d8bda7', mb: 2, overflow: "auto", flexGrow: 1, minHeight: 0 }}>
                            {legacyMode ? (
                                <Box sx={{ p: 2 }}>
                                    <Typography variant="body2" fontWeight={800}>
                                        {validLegacyRows.length} Transaksi Buku
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Customer: {LEGACY_CUSTOMER_NAME}
                                    </Typography>
                                    <Stack spacing={0.75} sx={{ mt: 1 }}>
                                        {validLegacyRows.map((row) => (
                                            <Stack key={row.id} direction="row" justifyContent="space-between" gap={1}>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {row.employee?.name} | Komisi {row.commissionPercent}%
                                                </Typography>
                                                <Typography variant="caption" fontWeight={800}>
                                                    {formatCurrency(row.amountValue)}
                                                </Typography>
                                            </Stack>
                                        ))}
                                    </Stack>
                                </Box>
                            ) : cart.length === 0 ? (
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
                                                <TextField
                                                    select
                                                    size="small"
                                                    label="Stylist layanan"
                                                    value={item.employee?.id ?? ""}
                                                    onChange={(event) => updateCartItemEmployee(index, Number(event.target.value))}
                                                    sx={{ mt: 1, minWidth: 180 }}
                                                >
                                                    {employees.map((emp) => (
                                                        <MenuItem key={emp.id} value={emp.id}>
                                                            {emp.name}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
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

                        <Stack spacing={1.2} sx={{ flexShrink: 0 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                                <Typography variant="body2" fontWeight="bold">{formatCurrency(subtotal)}</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" color="text.secondary">Diskon</Typography>
                                <Typography variant="body2" fontWeight="bold">-{formatCurrency(discountAmount)}</Typography>
                            </Stack>
                            {selectedVoucher && voucherDiscountAmount > 0 && (
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Typography variant="body2" color="text.secondary">Voucher</Typography>
                                    <Typography variant="body2" fontWeight="bold">-{formatCurrency(voucherDiscountAmount)}</Typography>
                                </Stack>
                            )}
                            <Divider />
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ bgcolor: "rgba(180, 123, 76, 0.10)", p: 1.25, borderRadius: 1 }}
                            >
                                <Typography variant="subtitle1" fontWeight={800}>Total</Typography>
                                <Typography variant="h5" fontWeight={900} color="primary.main">
                                    {formatCurrency(finalTotalDue)}
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
                            disabled={legacyMode ? validLegacyRows.length === 0 : cart.length === 0 || !customer.name || !selectedEmployee}
                            onClick={processTransaction}
                            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 'bold', fontSize: '1rem', mt: 2 }}
                        >
                            {legacyMode ? "Simpan Transaksi Buku" : initialData ? "Simpan Perubahan" : `Proses Pembayaran (${cart.length})`}
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
                            <Typography variant="body2" fontWeight={600}>{legacyMode ? LEGACY_CUSTOMER_NAME : customer.name || "-"}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">{legacyMode ? "Jumlah Baris" : "Stylist"}</Typography>
                            <Typography variant="body2" fontWeight={600}>{legacyMode ? validLegacyRows.length : selectedEmployee?.name || "-"}</Typography>
                        </Stack>
                        <Divider />
                        <Stack spacing={0.75}>
                            {legacyMode ? (
                                validLegacyRows.map((row) => (
                                    <Stack key={row.id} direction="row" justifyContent="space-between" gap={2}>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2">
                                                {row.employee?.name} - Komisi {row.commissionPercent}%
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Tanggal: {isAdmin ? transactionDate.replace("T", " ") : "Hari ini"}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: "nowrap" }}>
                                            {formatCurrency(row.amountValue)}
                                        </Typography>
                                    </Stack>
                                ))
                            ) : cart.map((item, index) => (
                                <Stack key={`${item.treatmentType}-${item.id}-${index}`} direction="row" justifyContent="space-between" gap={2}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body2">
                                            {item.treatmentType === "Package" ? `[PAKET] ${item.name}` : item.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Stylist: {item.employee?.name || "-"}
                                        </Typography>
                                    </Box>
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
                        {selectedVoucher && voucherDiscountAmount > 0 && (
                            <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">Voucher</Typography>
                                <Typography variant="body2">-{formatCurrency(voucherDiscountAmount)}</Typography>
                            </Stack>
                        )}
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="subtitle1" fontWeight={700}>Total Bayar</Typography>
                            <Typography variant="subtitle1" fontWeight={700} color="primary.main">{formatCurrency(finalTotalDue)}</Typography>
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
