import {useEffect, useMemo, useState} from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid,
    InputLabel,
    ListItemText,
    MenuItem,
    OutlinedInput,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from "@mui/material";
import {
    Add as AddIcon,
    Block as BlockIcon,
    CardGiftcard as VoucherIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    PersonAddAlt as AssignIcon
} from "@mui/icons-material";
import toast, {Toaster} from "react-hot-toast";
import AppShell from "../../components/AppShell.tsx";
import type {
    Customer,
    MemberVoucher,
    Treatment,
    TreatmentPackage,
    VoucherDiscountType,
    VoucherTemplate,
    VoucherTemplateRequest
} from "../../api/types.ts";
import {voucherService} from "../../api/service/voucherService.ts";
import {customerService} from "../../api/service/customerService.ts";
import {treatmentService} from "../../api/service/treatmentService.ts";
import {treatmentPackageService} from "../../api/service/treatmentPackageService.ts";

type VoucherScope = "ALL" | "TREATMENT" | "PACKAGE";

type TemplateForm = {
    name: string;
    description: string;
    discountType: VoucherDiscountType;
    discountValue: string;
    minimumTransaction: string;
    validityDays: string;
    scope: VoucherScope;
    treatmentIds: string[];
    treatmentPackageIds: string[];
    active: boolean;
};

const emptyTemplateForm: TemplateForm = {
    name: "",
    description: "",
    discountType: "FIXED",
    discountValue: "",
    minimumTransaction: "0",
    validityDays: "30",
    scope: "ALL",
    treatmentIds: [],
    treatmentPackageIds: [],
    active: true
};

function formatCurrency(value: number) {
    return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatDate(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatValidity(template: VoucherTemplate) {
    return template.neverExpires || template.validityDays < 1 ? "Tidak kadaluarsa" : `${template.validityDays} hari`;
}

function formatMemberVoucherExpiry(voucher: MemberVoucher) {
    if (voucher.neverExpires || voucher.template.neverExpires || voucher.template.validityDays < 1) {
        return "Tidak kadaluarsa";
    }

    return formatDate(voucher.expiresAt);
}

function formatDiscount(template: VoucherTemplate) {
    if (template.discountType === "PERCENTAGE") return `${template.discountValue}%`;
    return formatCurrency(template.discountValue);
}

function getTemplateScope(template: VoucherTemplate) {
    if (template.appliesToAll) return "Semua treatment";
    if (template.treatmentIds.length > 0) return `${template.treatmentIds.length} treatment`;
    if (template.treatmentPackageIds.length > 0) return `${template.treatmentPackageIds.length} paket`;
    return "Belum diatur";
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export default function VoucherPage() {
    const [templates, setTemplates] = useState<VoucherTemplate[]>([]);
    const [memberVouchers, setMemberVouchers] = useState<MemberVoucher[]>([]);
    const [members, setMembers] = useState<Customer[]>([]);
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [packages, setPackages] = useState<TreatmentPackage[]>([]);
    const [loading, setLoading] = useState(false);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<VoucherTemplate | null>(null);
    const [form, setForm] = useState<TemplateForm>(emptyTemplateForm);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [selectedCustomerId, setSelectedCustomerId] = useState("");

    const activeTemplates = useMemo(() => templates.filter((template) => template.active), [templates]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [templateRes, memberVoucherRes, memberRes, treatmentRes, packageRes] = await Promise.all([
                voucherService.getTemplates(),
                voucherService.getAllMemberVouchers(),
                customerService.getAll(),
                treatmentService.getAll(),
                treatmentPackageService.getAll()
            ]);

            setTemplates(templateRes.success && Array.isArray(templateRes.data) ? templateRes.data : []);
            setMemberVouchers(memberVoucherRes.success && Array.isArray(memberVoucherRes.data) ? memberVoucherRes.data : []);
            setMembers(memberRes.success && Array.isArray(memberRes.data) ? memberRes.data : []);
            setTreatments(treatmentRes.success && Array.isArray(treatmentRes.data) ? treatmentRes.data : []);
            setPackages(packageRes.success && Array.isArray(packageRes.data) ? packageRes.data : []);
        } catch (error) {
            console.error(error);
            toast.error("Gagal memuat data voucher.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openTemplateDialog = () => {
        setEditingTemplate(null);
        setForm(emptyTemplateForm);
        setTemplateDialogOpen(true);
    };

    const openEditTemplateDialog = (template: VoucherTemplate) => {
        setEditingTemplate(template);
        const scope: VoucherScope = template.appliesToAll
            ? "ALL"
            : template.treatmentIds.length > 0
                ? "TREATMENT"
                : "PACKAGE";
        setForm({
            name: template.name,
            description: template.description,
            discountType: template.discountType,
            discountValue: String(template.discountValue),
            minimumTransaction: String(template.minimumTransaction),
            validityDays: String(template.validityDays),
            scope,
            treatmentIds: template.treatmentIds.map(String),
            treatmentPackageIds: template.treatmentPackageIds.map(String),
            active: template.active
        });
        setTemplateDialogOpen(true);
    };

    const closeTemplateDialog = () => {
        setTemplateDialogOpen(false);
        setEditingTemplate(null);
        setForm(emptyTemplateForm);
    };

    const handleSaveTemplate = () => {
        const appliesToAll = form.scope === "ALL";
        const treatmentIds = form.scope === "TREATMENT" ? form.treatmentIds.map(Number).filter(Boolean) : [];
        const treatmentPackageIds = form.scope === "PACKAGE" ? form.treatmentPackageIds.map(Number).filter(Boolean) : [];
        const payload: VoucherTemplateRequest = {
            name: form.name.trim(),
            description: form.description.trim(),
            discountType: form.discountType,
            discountValue: Math.max(0, Number(form.discountValue) || 0),
            minimumTransaction: Math.max(0, Number(form.minimumTransaction) || 0),
            validityDays: Number(form.validityDays) || 0,
            appliesToAll,
            treatmentIds,
            treatmentPackageIds,
            active: form.active
        };

        if (!payload.name) {
            toast.error("Nama voucher wajib diisi.");
            return;
        }

        if (!payload.appliesToAll && payload.treatmentIds.length === 0 && payload.treatmentPackageIds.length === 0) {
            toast.error("Pilih minimal satu treatment atau paket.");
            return;
        }

        const promise = (
            editingTemplate
                ? voucherService.updateTemplate(editingTemplate.id, payload)
                : voucherService.createTemplate(payload)
        ).then((res) => {
            if (!res.success || !res.data) throw new Error(res.message || "Gagal menyimpan voucher.");
            setTemplates((prev) => {
                if (!editingTemplate) return [res.data!, ...prev];
                return prev.map((template) => template.id === editingTemplate.id ? res.data! : template);
            });
            closeTemplateDialog();
            return res;
        });

        toast.promise(promise, {
            loading: editingTemplate ? "Menyimpan perubahan voucher..." : "Membuat template voucher...",
            success: editingTemplate ? "Template voucher berhasil diperbarui." : "Template voucher berhasil dibuat.",
            error: (error: unknown) => getErrorMessage(error, "Gagal menyimpan voucher.")
        }).then(() => {});
    };

    const handleDeactivateTemplate = (template: VoucherTemplate) => {
        const promise = voucherService.deactivateTemplate(template.id).then((res) => {
            if (!res.success || !res.data) throw new Error(res.message || "Gagal menonaktifkan voucher.");
            setTemplates((prev) => prev.map((item) => item.id === template.id ? res.data! : item));
            return res;
        });

        toast.promise(promise, {
            loading: "Menonaktifkan voucher...",
            success: "Voucher dinonaktifkan.",
            error: (error: unknown) => getErrorMessage(error, "Gagal menonaktifkan voucher.")
        }).then(() => {});
    };

    const handleCancelMemberVoucher = (voucher: MemberVoucher) => {
        const promise = voucherService.cancelMemberVoucher(voucher.id).then((res) => {
            if (!res.success || !res.data) throw new Error(res.message || "Gagal menghapus voucher member.");
            setMemberVouchers((prev) => prev.map((item) => item.id === voucher.id ? res.data! : item));
            return res;
        });

        toast.promise(promise, {
            loading: "Menghapus voucher member...",
            success: "Voucher member berhasil dihapus.",
            error: (error: unknown) => getErrorMessage(error, "Gagal menghapus voucher member.")
        }).then(() => {});
    };

    const handleAssign = () => {
        const templateId = Number(selectedTemplateId);
        const customerId = Number(selectedCustomerId);

        if (!templateId || !customerId) {
            toast.error("Pilih template dan member dulu.");
            return;
        }

        const promise = voucherService.assignVoucher({ templateId, customerId }).then((res) => {
            if (!res.success || !res.data) throw new Error(res.message || "Gagal memberikan voucher.");
            setMemberVouchers((prev) => [res.data!, ...prev]);
            setAssignDialogOpen(false);
            setSelectedTemplateId("");
            setSelectedCustomerId("");
            return res;
        });

        toast.promise(promise, {
            loading: "Memberikan voucher...",
            success: "Voucher berhasil diberikan.",
            error: (error: unknown) => getErrorMessage(error, "Gagal memberikan voucher.")
        }).then(() => {});
    };

    return (
        <AppShell
            title="Voucher"
            subtitle="Voucher management untuk template promo dan voucher per member."
            actions={
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button variant="outlined" startIcon={<AssignIcon />} onClick={() => setAssignDialogOpen(true)}>
                        Berikan Voucher
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openTemplateDialog}>
                        Template Baru
                    </Button>
                </Stack>
            }
        >
            <Toaster />

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ borderRadius: 1 }}>
                        <CardContent>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <VoucherIcon color="primary" />
                                <Box>
                                    <Typography variant="h5" fontWeight={800}>{templates.length}</Typography>
                                    <Typography variant="body2" color="text.secondary">Template voucher</Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ borderRadius: 1 }}>
                        <CardContent>
                            <Typography variant="h5" fontWeight={800}>{activeTemplates.length}</Typography>
                            <Typography variant="body2" color="text.secondary">Template aktif</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ borderRadius: 1 }}>
                        <CardContent>
                            <Typography variant="h5" fontWeight={800}>{memberVouchers.length}</Typography>
                            <Typography variant="body2" color="text.secondary">Voucher member terbit</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ p: 3, borderRadius: 1, mb: 3 }}>
                <Typography variant="h6" fontWeight={800}>Template Voucher</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Template digunakan berulang untuk promo atau reward member.
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Voucher</TableCell>
                                <TableCell>Diskon</TableCell>
                                <TableCell>Minimum</TableCell>
                                <TableCell>Berlaku Untuk</TableCell>
                                <TableCell>Masa Berlaku</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={7} align="center">Memuat voucher...</TableCell></TableRow>
                            ) : templates.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center">Belum ada template voucher.</TableCell></TableRow>
                            ) : templates.map((template) => (
                                <TableRow key={template.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={700}>{template.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{template.description || "-"}</Typography>
                                    </TableCell>
                                    <TableCell>{formatDiscount(template)}</TableCell>
                                    <TableCell>{formatCurrency(template.minimumTransaction)}</TableCell>
                                    <TableCell>{getTemplateScope(template)}</TableCell>
                                    <TableCell>{formatValidity(template)}</TableCell>
                                    <TableCell>
                                        <Chip label={template.active ? "ACTIVE" : "INACTIVE"} color={template.active ? "success" : "default"} size="small" />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            <Button
                                                size="small"
                                                startIcon={<EditIcon />}
                                                onClick={() => openEditTemplateDialog(template)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                size="small"
                                                color="error"
                                                startIcon={<BlockIcon />}
                                                disabled={!template.active}
                                                onClick={() => handleDeactivateTemplate(template)}
                                            >
                                                Nonaktifkan
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 1 }}>
                <Typography variant="h6" fontWeight={800}>Voucher Member</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Riwayat voucher yang sudah diberikan ke member.
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Kode</TableCell>
                                <TableCell>Member</TableCell>
                                <TableCell>Voucher</TableCell>
                                <TableCell>Kedaluwarsa</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {memberVouchers.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center">Belum ada voucher member.</TableCell></TableRow>
                            ) : memberVouchers.map((voucher) => (
                                <TableRow key={voucher.id} hover>
                                    <TableCell>{voucher.code}</TableCell>
                                    <TableCell>{voucher.customerName}</TableCell>
                                    <TableCell>{voucher.template.name}</TableCell>
                                    <TableCell>{formatMemberVoucherExpiry(voucher)}</TableCell>
                                    <TableCell><Chip label={voucher.status} size="small" /></TableCell>
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            color="error"
                                            startIcon={<DeleteIcon />}
                                            disabled={voucher.status === "USED" || voucher.status === "CANCELLED"}
                                            onClick={() => handleCancelMemberVoucher(voucher)}
                                        >
                                            Hapus
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={templateDialogOpen} onClose={closeTemplateDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{editingTemplate ? "Edit Template Voucher" : "Template Voucher Baru"}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <TextField label="Nama voucher" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} fullWidth />
                        <TextField label="Deskripsi" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} fullWidth multiline minRows={2} />
                        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                            <TextField select label="Tipe diskon" value={form.discountType} onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as VoucherDiscountType }))} fullWidth>
                                <MenuItem value="FIXED">Nominal</MenuItem>
                                <MenuItem value="PERCENTAGE">Persentase</MenuItem>
                            </TextField>
                            <TextField label={form.discountType === "FIXED" ? "Nilai diskon (Rp)" : "Nilai diskon (%)"} type="number" value={form.discountValue} onChange={(e) => setForm((prev) => ({ ...prev, discountValue: e.target.value }))} fullWidth />
                        </Stack>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                            <TextField label="Minimum transaksi" type="number" value={form.minimumTransaction} onChange={(e) => setForm((prev) => ({ ...prev, minimumTransaction: e.target.value }))} fullWidth />
                            <TextField
                                label="Masa berlaku (hari)"
                                type="number"
                                value={form.validityDays}
                                onChange={(e) => setForm((prev) => ({ ...prev, validityDays: e.target.value }))}
                                helperText="Isi 0 atau kurang dari 1 agar voucher tidak kadaluarsa."
                                fullWidth
                            />
                        </Stack>
                        <TextField
                            select
                            label="Berlaku untuk"
                            value={form.scope}
                            onChange={(e) => setForm((prev) => ({
                                ...prev,
                                scope: e.target.value as VoucherScope,
                                treatmentIds: [],
                                treatmentPackageIds: []
                            }))}
                            fullWidth
                        >
                            <MenuItem value="ALL">Semua treatment</MenuItem>
                            <MenuItem value="TREATMENT">Treatment tertentu</MenuItem>
                            <MenuItem value="PACKAGE">Paket tertentu</MenuItem>
                        </TextField>
                        {form.scope === "TREATMENT" && (
                            <FormControl fullWidth>
                                <InputLabel id="voucher-treatment-scope-label">Pilih treatment</InputLabel>
                                <Select
                                    labelId="voucher-treatment-scope-label"
                                    multiple
                                    value={form.treatmentIds}
                                    onChange={(e) => setForm((prev) => ({
                                        ...prev,
                                        treatmentIds: typeof e.target.value === "string"
                                            ? e.target.value.split(",")
                                            : e.target.value
                                    }))}
                                    input={<OutlinedInput label="Pilih treatment" />}
                                    renderValue={(selected) => selected
                                        .map((id) => treatments.find((item) => item.id === Number(id))?.title)
                                        .filter(Boolean)
                                        .join(", ")}
                                >
                                    {treatments.map((treatment) => (
                                        <MenuItem key={treatment.id} value={String(treatment.id)}>
                                            <Checkbox checked={form.treatmentIds.includes(String(treatment.id))} />
                                            <ListItemText primary={treatment.title} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        {form.scope === "PACKAGE" && (
                            <FormControl fullWidth>
                                <InputLabel id="voucher-package-scope-label">Pilih paket</InputLabel>
                                <Select
                                    labelId="voucher-package-scope-label"
                                    multiple
                                    value={form.treatmentPackageIds}
                                    onChange={(e) => setForm((prev) => ({
                                        ...prev,
                                        treatmentPackageIds: typeof e.target.value === "string"
                                            ? e.target.value.split(",")
                                            : e.target.value
                                    }))}
                                    input={<OutlinedInput label="Pilih paket" />}
                                    renderValue={(selected) => selected
                                        .map((id) => packages.find((item) => item.id === Number(id))?.title)
                                        .filter(Boolean)
                                        .join(", ")}
                                >
                                    {packages.map((pkg) => (
                                        <MenuItem key={pkg.id} value={String(pkg.id)}>
                                            <Checkbox checked={form.treatmentPackageIds.includes(String(pkg.id))} />
                                            <ListItemText primary={pkg.title} />
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeTemplateDialog}>Batal</Button>
                    <Button variant="contained" onClick={handleSaveTemplate}>Simpan</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Berikan Voucher ke Member</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <TextField select label="Template voucher" value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} fullWidth>
                            {activeTemplates.map((template) => (
                                <MenuItem key={template.id} value={template.id}>
                                    {template.name} - {formatDiscount(template)}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField select label="Member" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} fullWidth>
                            {members.map((member) => (
                                <MenuItem key={member.id} value={member.id ?? ""}>
                                    {member.name} {member.phoneNumber ? `- ${member.phoneNumber}` : ""}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAssignDialogOpen(false)}>Batal</Button>
                    <Button variant="contained" onClick={handleAssign}>Berikan</Button>
                </DialogActions>
            </Dialog>
        </AppShell>
    );
}
