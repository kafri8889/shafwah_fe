import type {CustomerTransaction, CustomerTransactionItem} from "../../api/types.ts";

export type ChartPoint = {
    name: string;
    value: number;
};

export function formatCurrency(value: number) {
    return `Rp ${value.toLocaleString("id-ID")}`;
}

export function parseDate(value: string) {
    if (!value) return null;
    const parsed = new Date(value.includes("T") ? value : value.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(value: string) {
    const parsed = parseDate(value);
    if (!parsed) return "-";

    return parsed.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

export function formatDateInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function filterTransactionsByDate(
    transactions: CustomerTransaction[],
    rangePreset: string,
    startDate: string,
    endDate: string
) {
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
    } else if (rangePreset === "custom" && startDate && endDate) {
        rangeStart = new Date(startDate + "T00:00:00");
        rangeEnd = new Date(endDate + "T23:59:59.999");
    }

    if (!rangeStart && !rangeEnd) return transactions;

    return transactions.filter((trx) => {
        const parsed = parseDate(trx.date);
        if (!parsed) return false;
        if (rangeStart && parsed < rangeStart) return false;
        if (rangeEnd && parsed > rangeEnd) return false;
        return true;
    });
}

export function getItemName(item: CustomerTransactionItem) {
    if (item.treatmentType === "Package" && item.treatmentPackage) {
        return item.treatmentPackage.title;
    }

    return item.treatment?.title || "Layanan tidak diketahui";
}

export function buildItemStats(transactions: CustomerTransaction[], type?: "Single" | "Package"): ChartPoint[] {
    const counts = new Map<string, number>();

    transactions.forEach((trx) => {
        trx.items?.forEach((item) => {
            if (type && item.treatmentType !== type) return;
            const name = getItemName(item);
            counts.set(name, (counts.get(name) || 0) + 1);
        });
    });

    return Array.from(counts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
}

export function itemHandledByEmployee(item: CustomerTransactionItem, employeeId: number) {
    return item.employee?.id === employeeId;
}

export function transactionHandledByEmployee(transaction: CustomerTransaction, employeeId: number) {
    return transaction.employee?.id === employeeId || transaction.items?.some((item) => itemHandledByEmployee(item, employeeId));
}

export function getEmployeeItems(transaction: CustomerTransaction, employeeId: number) {
    const items = transaction.items || [];
    const directItems = items.filter((item) => itemHandledByEmployee(item, employeeId));
    return directItems.length > 0 ? directItems : (transaction.employee?.id === employeeId ? items : []);
}

export function getEmployeeRevenue(transaction: CustomerTransaction, employeeId: number) {
    return getEmployeeItems(transaction, employeeId).reduce((sum, item) => sum + (item.price || 0), 0);
}

export function calculateItemCommission(item: CustomerTransactionItem) {
    if (item.treatmentType === "Single" && item.treatment) {
        const value = item.treatment.staffCommissionValue || 0;
        return item.treatment.staffCommissionType === "FIXED"
            ? value
            : (item.price || 0) * value / 100;
    }

    if (item.treatmentType === "Package" && item.treatmentPackage?.treatments?.length) {
        const includedTreatments = item.treatmentPackage.treatments;
        const splitPrice = (item.price || 0) / includedTreatments.length;

        return includedTreatments.reduce((sum, treatment) => {
            const value = treatment.staffCommissionValue || 0;
            const commission = treatment.staffCommissionType === "FIXED"
                ? value
                : splitPrice * value / 100;
            return sum + commission;
        }, 0);
    }

    return 0;
}

export function getEmployeeCommission(transaction: CustomerTransaction, employeeId: number) {
    return getEmployeeItems(transaction, employeeId).reduce((sum, item) => sum + calculateItemCommission(item), 0);
}

export function formatItemCommissionRule(item: CustomerTransactionItem) {
    if (item.treatmentType === "Single" && item.treatment) {
        const value = item.treatment.staffCommissionValue || 0;
        if (!value) return "Tanpa komisi";
        return item.treatment.staffCommissionType === "FIXED" ? formatCurrency(value) : `${value}%`;
    }

    if (item.treatmentType === "Package" && item.treatmentPackage?.treatments?.length) {
        return "Akumulasi isi paket";
    }

    return "Tanpa komisi";
}

export function buildEmployeeItemStats(transactions: CustomerTransaction[], employeeId: number, type?: "Single" | "Package"): ChartPoint[] {
    const counts = new Map<string, number>();

    transactions.forEach((trx) => {
        getEmployeeItems(trx, employeeId).forEach((item) => {
            if (type && item.treatmentType !== type) return;
            const name = getItemName(item);
            counts.set(name, (counts.get(name) || 0) + 1);
        });
    });

    return Array.from(counts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
}

export function buildMemberStats(transactions: CustomerTransaction[]): ChartPoint[] {
    const counts = new Map<string, number>();

    transactions.forEach((trx) => {
        const name = trx.customer?.name || "Tanpa nama";
        counts.set(name, (counts.get(name) || 0) + 1);
    });

    return Array.from(counts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
}

export function buildSpendTrend(transactions: CustomerTransaction[]): ChartPoint[] {
    if (transactions.length === 0) return [];

    const sortedDates = transactions
        .map((trx) => parseDate(trx.date))
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => a.getTime() - b.getTime());

    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    const dayRange = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / 86_400_000));
    const useDailyBuckets = dayRange <= 45;
    const buckets = new Map<string, ChartPoint>();

    transactions.forEach((trx) => {
        const parsed = parseDate(trx.date);
        if (!parsed) return;

        const key = useDailyBuckets
            ? formatDateInput(parsed)
            : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
        const name = useDailyBuckets
            ? parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
            : parsed.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });

        buckets.set(key, {
            name,
            value: (buckets.get(key)?.value || 0) + (trx.actualPrice || 0)
        });
    });

    return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, point]) => point);
}

export function buildEmployeeSpendTrend(transactions: CustomerTransaction[], employeeId: number): ChartPoint[] {
    if (transactions.length === 0) return [];

    const sortedDates = transactions
        .map((trx) => parseDate(trx.date))
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => a.getTime() - b.getTime());

    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    const dayRange = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / 86_400_000));
    const useDailyBuckets = dayRange <= 45;
    const buckets = new Map<string, ChartPoint>();

    transactions.forEach((trx) => {
        const parsed = parseDate(trx.date);
        if (!parsed) return;

        const key = useDailyBuckets
            ? formatDateInput(parsed)
            : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
        const name = useDailyBuckets
            ? parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
            : parsed.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });

        buckets.set(key, {
            name,
            value: (buckets.get(key)?.value || 0) + getEmployeeRevenue(trx, employeeId)
        });
    });

    return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, point]) => point);
}

export function uniqueCustomerCount(transactions: CustomerTransaction[]) {
    return new Set(transactions.map((trx) => trx.customer?.id || trx.customer?.name).filter(Boolean)).size;
}
