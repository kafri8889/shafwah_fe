import {useEffect, useMemo, useState} from "react";
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    FormControlLabel,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    Switch,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Inventory2 as PackageIcon,
    Refresh as RefreshIcon,
    Spa as SpaIcon
} from "@mui/icons-material";
import toast, {Toaster} from "react-hot-toast";
import AppShell from "../../components/AppShell.tsx";
import type {
    Treatment,
    TreatmentCategory,
    TreatmentPackage,
    TreatmentPackageRequest,
    TreatmentRequest
} from "../../api/types.ts";
import {treatmentService} from "../../api/service/treatmentService.ts";
import {treatmentPackageService} from "../../api/service/treatmentPackageService.ts";
import {treatmentCategoryService} from "../../api/service/treatmentCategoryService.ts";

type TreatmentFormState = {
    title: string;
    categoryId: string;
    active: boolean;
    priceType: string;
    priceText: string;
    staffCommissionType: "PERCENTAGE" | "FIXED";
    staffCommissionValue: string;
};

type PackageFormState = {
    title: string;
    categoryId: string;
    active: boolean;
    price: string;
    treatments: Treatment[];
};

const emptyTreatmentForm: TreatmentFormState = {
    title: "",
    categoryId: "",
    active: true,
    priceType: "Fixed",
    priceText: "",
    staffCommissionType: "PERCENTAGE",
    staffCommissionValue: "0"
};

const emptyPackageForm: PackageFormState = {
    title: "",
    categoryId: "",
    active: true,
    price: "",
    treatments: []
};

function formatCurrency(value: number) {
    return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function formatPrices(prices: number[]) {
    if (!prices || prices.length === 0) return "-";
    return prices.map(formatCurrency).join(", ");
}

function formatCommission(type: string, value: number) {
    if (!value) return "-";
    return type === "FIXED" ? formatCurrency(value) : `${value}%`;
}

function parsePriceText(value: string) {
    return value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item) && item >= 0);
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export default function TreatmentManagementPage() {
    const [tab, setTab] = useState(0);
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [packages, setPackages] = useState<TreatmentPackage[]>([]);
    const [categories, setCategories] = useState<TreatmentCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [activeFilter, setActiveFilter] = useState("all");

    const [treatmentDialogOpen, setTreatmentDialogOpen] = useState(false);
    const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
    const [treatmentForm, setTreatmentForm] = useState<TreatmentFormState>(emptyTreatmentForm);
    const [treatmentToDelete, setTreatmentToDelete] = useState<Treatment | null>(null);

    const [packageDialogOpen, setPackageDialogOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<TreatmentPackage | null>(null);
    const [packageForm, setPackageForm] = useState<PackageFormState>(emptyPackageForm);
    const [packageToDelete, setPackageToDelete] = useState<TreatmentPackage | null>(null);

    const loadData = () => {
        setLoading(true);
        Promise.all([
            treatmentService.getAll(),
            treatmentPackageService.getAll(),
            treatmentCategoryService.getAll()
        ])
            .then(([treatmentRes, packageRes, categoryRes]) => {
                setTreatments(treatmentRes.success && Array.isArray(treatmentRes.data) ? treatmentRes.data : []);
                setPackages(packageRes.success && Array.isArray(packageRes.data) ? packageRes.data : []);
                setCategories(categoryRes.success && Array.isArray(categoryRes.data) ? categoryRes.data : []);
            })
            .catch((error) => {
                console.error(error);
                toast.error("Gagal memuat master treatment dan paket.");
                setTreatments([]);
                setPackages([]);
                setCategories([]);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        Promise.all([
            treatmentService.getAll(),
            treatmentPackageService.getAll(),
            treatmentCategoryService.getAll()
        ])
            .then(([treatmentRes, packageRes, categoryRes]) => {
                setTreatments(treatmentRes.success && Array.isArray(treatmentRes.data) ? treatmentRes.data : []);
                setPackages(packageRes.success && Array.isArray(packageRes.data) ? packageRes.data : []);
                setCategories(categoryRes.success && Array.isArray(categoryRes.data) ? categoryRes.data : []);
            })
            .catch((error) => {
                console.error(error);
                toast.error("Gagal memuat master treatment dan paket.");
                setTreatments([]);
                setPackages([]);
                setCategories([]);
            })
            .finally(() => setLoading(false));
    }, []);

    const categoryMap = useMemo(() => {
        const map = new Map<number, TreatmentCategory>();
        categories.forEach((category) => map.set(category.id, category));
        return map;
    }, [categories]);

    const filteredTreatments = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        return [...treatments]
            .filter((item) => {
                const categoryName = item.category?.title || "";
                const matchesKeyword = !keyword ||
                    item.title.toLowerCase().includes(keyword) ||
                    categoryName.toLowerCase().includes(keyword) ||
                    item.priceType.toLowerCase().includes(keyword);
                const matchesCategory = categoryFilter === "all" || item.category?.id === Number(categoryFilter);
                const matchesActive = activeFilter === "all" ||
                    (activeFilter === "active" && item.active) ||
                    (activeFilter === "inactive" && !item.active);

                return matchesKeyword && matchesCategory && matchesActive;
            })
            .sort((a, b) => (a.category?.title || "").localeCompare(b.category?.title || "") || a.title.localeCompare(b.title));
    }, [treatments, searchTerm, categoryFilter, activeFilter]);

    const filteredPackages = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        return [...packages]
            .filter((item) => {
                const categoryName = item.category?.title || "";
                const treatmentNames = item.treatments?.map((treatment) => treatment.title).join(" ") || "";
                const matchesKeyword = !keyword ||
                    item.title.toLowerCase().includes(keyword) ||
                    categoryName.toLowerCase().includes(keyword) ||
                    treatmentNames.toLowerCase().includes(keyword);
                const matchesCategory = categoryFilter === "all" || item.category?.id === Number(categoryFilter);
                const matchesActive = activeFilter === "all" ||
                    (activeFilter === "active" && item.active) ||
                    (activeFilter === "inactive" && !item.active);

                return matchesKeyword && matchesCategory && matchesActive;
            })
            .sort((a, b) => (a.category?.title || "").localeCompare(b.category?.title || "") || a.title.localeCompare(b.title));
    }, [packages, searchTerm, categoryFilter, activeFilter]);

    const openCreateTreatment = () => {
        setEditingTreatment(null);
        setTreatmentForm({
            ...emptyTreatmentForm,
            categoryId: categories[0]?.id ? String(categories[0].id) : ""
        });
        setTreatmentDialogOpen(true);
    };

    const openEditTreatment = (treatment: Treatment) => {
        setEditingTreatment(treatment);
        setTreatmentForm({
            title: treatment.title || "",
            categoryId: treatment.category?.id ? String(treatment.category.id) : "",
            active: treatment.active,
            priceType: treatment.priceType || "Fixed",
            priceText: (treatment.prices || []).join(", "),
            staffCommissionType: treatment.staffCommissionType || "PERCENTAGE",
            staffCommissionValue: String(treatment.staffCommissionValue || 0)
        });
        setTreatmentDialogOpen(true);
    };

    const closeTreatmentDialog = () => {
        setTreatmentDialogOpen(false);
        setEditingTreatment(null);
        setTreatmentForm(emptyTreatmentForm);
    };

    const saveTreatment = () => {
        const prices = parsePriceText(treatmentForm.priceText);
        const categoryId = Number(treatmentForm.categoryId);
        const staffCommissionValue = Number(treatmentForm.staffCommissionValue);

        if (!treatmentForm.title.trim()) {
            toast.error("Nama treatment wajib diisi.");
            return;
        }

        if (!categoryId) {
            toast.error("Kategori wajib dipilih.");
            return;
        }

        if (prices.length === 0) {
            toast.error("Harga treatment wajib diisi.");
            return;
        }

        if (treatmentForm.priceType !== "Fixed" && prices.length < 2) {
            toast.error("Range/Option butuh minimal dua harga.");
            return;
        }

        if (!Number.isFinite(staffCommissionValue) || staffCommissionValue < 0) {
            toast.error("Komisi staff tidak valid.");
            return;
        }

        if (treatmentForm.staffCommissionType === "PERCENTAGE" && staffCommissionValue > 100) {
            toast.error("Komisi persen maksimal 100%.");
            return;
        }

        const payload: TreatmentRequest = {
            id: editingTreatment?.id ?? -1,
            title: treatmentForm.title.trim(),
            categoryId,
            active: treatmentForm.active,
            priceType: treatmentForm.priceType,
            prices,
            staffCommissionType: treatmentForm.staffCommissionType,
            staffCommissionValue
        };

        const request = editingTreatment
            ? treatmentService.update(editingTreatment.id, payload)
            : treatmentService.create(payload);

        const promise = request.then((res) => {
            if (!res.success || !res.data) {
                throw new Error(res.message || "Gagal menyimpan treatment.");
            }

            setTreatments((prev) => editingTreatment
                ? prev.map((item) => item.id === res.data?.id ? res.data : item)
                : [...prev, res.data as Treatment]
            );
            closeTreatmentDialog();
            return res;
        });

        toast.promise(promise, {
            loading: "Menyimpan treatment...",
            success: "Treatment berhasil disimpan.",
            error: (error: unknown) => getErrorMessage(error, "Gagal menyimpan treatment.")
        }).then(() => {});
    };

    const deleteTreatment = () => {
        if (!treatmentToDelete) return;
        const id = treatmentToDelete.id;

        const promise = treatmentService.delete(id).then((res) => {
            if (!res.success) {
                throw new Error(res.message || "Gagal menghapus treatment.");
            }

            setTreatments((prev) => prev.filter((item) => item.id !== id));
            setTreatmentToDelete(null);
            return res;
        });

        toast.promise(promise, {
            loading: "Menghapus treatment...",
            success: "Treatment berhasil dihapus.",
            error: (error: unknown) => getErrorMessage(error, "Gagal menghapus treatment. Cek apakah masih dipakai transaksi, paket, atau voucher.")
        }).then(() => {});
    };

    const openCreatePackage = () => {
        setEditingPackage(null);
        setPackageForm({
            ...emptyPackageForm,
            categoryId: categories[0]?.id ? String(categories[0].id) : ""
        });
        setPackageDialogOpen(true);
    };

    const openEditPackage = (pkg: TreatmentPackage) => {
        setEditingPackage(pkg);
        setPackageForm({
            title: pkg.title || "",
            categoryId: pkg.category?.id ? String(pkg.category.id) : "",
            active: pkg.active,
            price: String(pkg.price || ""),
            treatments: pkg.treatments || []
        });
        setPackageDialogOpen(true);
    };

    const closePackageDialog = () => {
        setPackageDialogOpen(false);
        setEditingPackage(null);
        setPackageForm(emptyPackageForm);
    };

    const savePackage = () => {
        const categoryId = Number(packageForm.categoryId);
        const price = Number(packageForm.price);

        if (!packageForm.title.trim()) {
            toast.error("Nama paket wajib diisi.");
            return;
        }

        if (!categoryId) {
            toast.error("Kategori wajib dipilih.");
            return;
        }

        if (!Number.isFinite(price) || price < 0) {
            toast.error("Harga paket tidak valid.");
            return;
        }

        if (packageForm.treatments.length === 0) {
            toast.error("Paket wajib berisi minimal satu treatment.");
            return;
        }

        const payload: TreatmentPackageRequest = {
            title: packageForm.title.trim(),
            categoryId,
            active: packageForm.active,
            price,
            treatmentIds: packageForm.treatments.map((item) => item.id)
        };

        const request = editingPackage
            ? treatmentPackageService.update(editingPackage.id, payload)
            : treatmentPackageService.create(payload);

        const promise = request.then((res) => {
            if (!res.success || !res.data) {
                throw new Error(res.message || "Gagal menyimpan paket.");
            }

            setPackages((prev) => editingPackage
                ? prev.map((item) => item.id === res.data?.id ? res.data : item)
                : [...prev, res.data as TreatmentPackage]
            );
            closePackageDialog();
            return res;
        });

        toast.promise(promise, {
            loading: "Menyimpan paket...",
            success: "Paket berhasil disimpan.",
            error: (error: unknown) => getErrorMessage(error, "Gagal menyimpan paket.")
        }).then(() => {});
    };

    const deletePackage = () => {
        if (!packageToDelete) return;
        const id = packageToDelete.id;

        const promise = treatmentPackageService.delete(id).then((res) => {
            if (!res.success) {
                throw new Error(res.message || "Gagal menghapus paket.");
            }

            setPackages((prev) => prev.filter((item) => item.id !== id));
            setPackageToDelete(null);
            return res;
        });

        toast.promise(promise, {
            loading: "Menghapus paket...",
            success: "Paket berhasil dihapus.",
            error: (error: unknown) => getErrorMessage(error, "Gagal menghapus paket. Cek apakah masih dipakai transaksi atau voucher.")
        }).then(() => {});
    };

    return (
        <AppShell
            title="Treatment & Paket"
            subtitle="Kelola master treatment dan paket sebagai dasar transaksi, voucher, dan komisi per treatment."
            actions={
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={tab === 0 ? openCreateTreatment : openCreatePackage}
                    >
                        {tab === 0 ? "Tambah Treatment" : "Tambah Paket"}
                    </Button>
                </Stack>
            }
        >
            <Toaster />

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, mb: 3 }}>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} justifyContent="space-between">
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800}>Filter Master Data</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Pencarian dan filter berlaku untuk tab yang sedang dibuka.
                        </Typography>
                    </Box>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
                        <TextField
                            size="small"
                            label="Cari"
                            placeholder="Nama, kategori, isi paket..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            sx={{ minWidth: 260 }}
                        />
                        <TextField
                            select
                            size="small"
                            label="Kategori"
                            value={categoryFilter}
                            onChange={(event) => setCategoryFilter(event.target.value)}
                            sx={{ minWidth: 220 }}
                        >
                            <MenuItem value="all">Semua kategori</MenuItem>
                            {categories.map((category) => (
                                <MenuItem key={category.id} value={String(category.id)}>
                                    {category.title}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            size="small"
                            label="Status"
                            value={activeFilter}
                            onChange={(event) => setActiveFilter(event.target.value)}
                            sx={{ minWidth: 150 }}
                        >
                            <MenuItem value="all">Semua</MenuItem>
                            <MenuItem value="active">Aktif</MenuItem>
                            <MenuItem value="inactive">Nonaktif</MenuItem>
                        </TextField>
                    </Stack>
                </Stack>
            </Paper>

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Total Treatment</Typography>
                        <Typography variant="h5" fontWeight={900}>{treatments.length.toLocaleString("id-ID")}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Treatment Aktif</Typography>
                        <Typography variant="h5" fontWeight={900}>{treatments.filter((item) => item.active).length.toLocaleString("id-ID")}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Total Paket</Typography>
                        <Typography variant="h5" fontWeight={900}>{packages.length.toLocaleString("id-ID")}</Typography>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Kategori</Typography>
                        <Typography variant="h5" fontWeight={900}>{categories.length.toLocaleString("id-ID")}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Paper sx={{ p: 3, borderRadius: 1 }}>
                <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
                    <Tab icon={<SpaIcon />} iconPosition="start" label={`Treatment (${filteredTreatments.length})`} />
                    <Tab icon={<PackageIcon />} iconPosition="start" label={`Paket (${filteredPackages.length})`} />
                </Tabs>
                <Divider sx={{ mb: 2 }} />

                {tab === 0 ? (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Treatment</TableCell>
                                    <TableCell>Kategori</TableCell>
                                    <TableCell>Tipe Harga</TableCell>
                                    <TableCell>Harga</TableCell>
                                    <TableCell>Komisi Staff</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">Memuat treatment...</TableCell>
                                    </TableRow>
                                ) : filteredTreatments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">Treatment tidak ditemukan.</TableCell>
                                    </TableRow>
                                ) : filteredTreatments.map((treatment) => (
                                    <TableRow key={treatment.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={800}>{treatment.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">ID #{treatment.id}</Typography>
                                        </TableCell>
                                        <TableCell>{treatment.category?.title || "-"}</TableCell>
                                        <TableCell><Chip size="small" label={treatment.priceType} /></TableCell>
                                        <TableCell>{formatPrices(treatment.prices || [])}</TableCell>
                                        <TableCell>{formatCommission(treatment.staffCommissionType || "PERCENTAGE", treatment.staffCommissionValue || 0)}</TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={treatment.active ? "Aktif" : "Nonaktif"}
                                                color={treatment.active ? "success" : "default"}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Edit treatment">
                                                <IconButton size="small" onClick={() => openEditTreatment(treatment)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Hapus treatment">
                                                <IconButton size="small" color="error" onClick={() => setTreatmentToDelete(treatment)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Paket</TableCell>
                                    <TableCell>Kategori</TableCell>
                                    <TableCell>Isi Treatment</TableCell>
                                    <TableCell align="right">Harga</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">Memuat paket...</TableCell>
                                    </TableRow>
                                ) : filteredPackages.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">Paket tidak ditemukan.</TableCell>
                                    </TableRow>
                                ) : filteredPackages.map((pkg) => (
                                    <TableRow key={pkg.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={800}>{pkg.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">ID #{pkg.id}</Typography>
                                        </TableCell>
                                        <TableCell>{pkg.category?.title || "-"}</TableCell>
                                        <TableCell sx={{ maxWidth: 480 }}>
                                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                                {(pkg.treatments || []).map((treatment) => (
                                                    <Chip key={treatment.id} size="small" label={treatment.title} sx={{ borderRadius: 1 }} />
                                                ))}
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="right">{formatCurrency(pkg.price)}</TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={pkg.active ? "Aktif" : "Nonaktif"}
                                                color={pkg.active ? "success" : "default"}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Edit paket">
                                                <IconButton size="small" onClick={() => openEditPackage(pkg)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Hapus paket">
                                                <IconButton size="small" color="error" onClick={() => setPackageToDelete(pkg)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            <Dialog open={treatmentDialogOpen} onClose={closeTreatmentDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingTreatment ? "Edit Treatment" : "Tambah Treatment"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <TextField
                            label="Nama treatment"
                            value={treatmentForm.title}
                            onChange={(event) => setTreatmentForm((prev) => ({ ...prev, title: event.target.value }))}
                            fullWidth
                        />
                        <TextField
                            select
                            label="Kategori"
                            value={treatmentForm.categoryId}
                            onChange={(event) => setTreatmentForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                            fullWidth
                        >
                            {categories.map((category) => (
                                <MenuItem key={category.id} value={String(category.id)}>
                                    {category.title}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label="Tipe harga"
                            value={treatmentForm.priceType}
                            onChange={(event) => setTreatmentForm((prev) => ({ ...prev, priceType: event.target.value }))}
                            fullWidth
                        >
                            <MenuItem value="Fixed">Fixed</MenuItem>
                            <MenuItem value="Range">Range</MenuItem>
                            <MenuItem value="Option">Option</MenuItem>
                        </TextField>
                        <TextField
                            label="Harga"
                            value={treatmentForm.priceText}
                            onChange={(event) => setTreatmentForm((prev) => ({ ...prev, priceText: event.target.value }))}
                            helperText="Pisahkan banyak harga dengan koma. Contoh: 50000, 75000"
                            fullWidth
                        />
                        <Grid container spacing={1.5}>
                            <Grid size={{ xs: 12, sm: 5 }}>
                                <TextField
                                    select
                                    label="Tipe komisi staff"
                                    value={treatmentForm.staffCommissionType}
                                    onChange={(event) => setTreatmentForm((prev) => ({
                                        ...prev,
                                        staffCommissionType: event.target.value as "PERCENTAGE" | "FIXED"
                                    }))}
                                    fullWidth
                                >
                                    <MenuItem value="PERCENTAGE">Persen</MenuItem>
                                    <MenuItem value="FIXED">Nominal</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 7 }}>
                                <TextField
                                    label={treatmentForm.staffCommissionType === "FIXED" ? "Komisi staff (Rp)" : "Komisi staff (%)"}
                                    type="number"
                                    value={treatmentForm.staffCommissionValue}
                                    onChange={(event) => setTreatmentForm((prev) => ({ ...prev, staffCommissionValue: event.target.value }))}
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={treatmentForm.active}
                                    onChange={(event) => setTreatmentForm((prev) => ({ ...prev, active: event.target.checked }))}
                                />
                            }
                            label={treatmentForm.active ? "Aktif" : "Nonaktif"}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeTreatmentDialog}>Batal</Button>
                    <Button variant="contained" onClick={saveTreatment}>Simpan</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={packageDialogOpen} onClose={closePackageDialog} maxWidth="md" fullWidth>
                <DialogTitle>{editingPackage ? "Edit Paket" : "Tambah Paket"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <TextField
                            label="Nama paket"
                            value={packageForm.title}
                            onChange={(event) => setPackageForm((prev) => ({ ...prev, title: event.target.value }))}
                            fullWidth
                        />
                        <TextField
                            select
                            label="Kategori"
                            value={packageForm.categoryId}
                            onChange={(event) => setPackageForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                            fullWidth
                        >
                            {categories.map((category) => (
                                <MenuItem key={category.id} value={String(category.id)}>
                                    {category.title}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            label="Harga paket"
                            type="number"
                            value={packageForm.price}
                            onChange={(event) => setPackageForm((prev) => ({ ...prev, price: event.target.value }))}
                            fullWidth
                        />
                        <Autocomplete
                            multiple
                            options={treatments}
                            value={packageForm.treatments}
                            getOptionLabel={(option) => option.title}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            onChange={(_, value) => setPackageForm((prev) => ({ ...prev, treatments: value }))}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Isi treatment"
                                    helperText="Pilih treatment yang masuk ke paket ini."
                                />
                            )}
                            renderOption={(props, option) => (
                                <Box component="li" {...props} key={option.id}>
                                    <Stack>
                                        <Typography variant="body2">{option.title}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {categoryMap.get(option.category?.id)?.title || option.category?.title || "-"} | {formatPrices(option.prices || [])}
                                        </Typography>
                                    </Stack>
                                </Box>
                            )}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={packageForm.active}
                                    onChange={(event) => setPackageForm((prev) => ({ ...prev, active: event.target.checked }))}
                                />
                            }
                            label={packageForm.active ? "Aktif" : "Nonaktif"}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closePackageDialog}>Batal</Button>
                    <Button variant="contained" onClick={savePackage}>Simpan</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(treatmentToDelete)} onClose={() => setTreatmentToDelete(null)}>
                <DialogTitle>Hapus Treatment</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Yakin ingin menghapus treatment {treatmentToDelete?.title || ""}? Jika sudah dipakai transaksi, paket, atau voucher, backend bisa menolak.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTreatmentToDelete(null)}>Batal</Button>
                    <Button variant="contained" color="error" onClick={deleteTreatment}>Hapus</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(packageToDelete)} onClose={() => setPackageToDelete(null)}>
                <DialogTitle>Hapus Paket</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Yakin ingin menghapus paket {packageToDelete?.title || ""}? Jika sudah dipakai transaksi atau voucher, backend bisa menolak.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPackageToDelete(null)}>Batal</Button>
                    <Button variant="contained" color="error" onClick={deletePackage}>Hapus</Button>
                </DialogActions>
            </Dialog>
        </AppShell>
    );
}
