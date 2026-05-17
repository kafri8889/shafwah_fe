import {formatDateTime} from "../util/date";

export type TreatmentType = 'Single' | 'Package';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS';
export type VoucherDiscountType = "PERCENTAGE" | "FIXED";
export type StaffCommissionType = "PERCENTAGE" | "FIXED";
export type MemberVoucherStatus = "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
export type ExpenseKind = "FIXED" | "VARIABLE" | "ONE_TIME";
export type RecurringExpenseFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
export type CashReconciliationStatus = "BALANCED" | "OVER" | "SHORT";

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T | null;
}

export interface PagedResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

export interface TreatmentCategory {
    id: number;
    title: string;
    subTitle: string;
    notes: string[];
}

export interface Treatment {
    id: number;
    category: TreatmentCategory;
    title: string;
    active: boolean;
    priceType: string;
    prices: number[];
    staffCommissionType?: StaffCommissionType;
    staffCommissionValue?: number;
}

export interface TreatmentPackage {
    id: number;
    category: TreatmentCategory;
    title: string;
    price: number;
    active: boolean;
    treatments: Treatment[];
}

export interface Customer {
    id: number | null;
    name: string;
    phoneNumber: string;
    address: string;
    birthDate?: string | null;
    visitCount: number;
    totalVisitCount: number;
    lastVisitDate: string;
}

export interface Employee {
    id: number;
    name: string;
    username?: string;
    password?: string;
    role: string;
    accessRole?: string;
    phoneNumber: string;
    active?: boolean;
}

export interface EmployeeResponse {
    id: number;
    name: string;
    username: string;
    role: string;
    accessRole: string;
    phoneNumber: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    name: string;
    username: string;
    password: string;
    phoneNumber: string;
    role: string;
    accessRole: string;
}

export interface TreatmentRequest {
    id: number;
    categoryId: number;
    title: string;
    active: boolean;
    priceType: string;
    prices: number[];
    staffCommissionType: StaffCommissionType;
    staffCommissionValue: number;
}

export interface TreatmentPackageRequest {
    title: string;
    price: number;
    active: boolean;
    categoryId: number;
    treatmentIds: number[];
}

export interface CartItem {
    id: number;
    name: string;
    price: number;
    treatmentType: TreatmentType;
    employee?: Employee | null;
    details?: string;
    priceLabel?: string;
}

export interface CustomerTransactionItem {
    id: number;
    treatment: Treatment | null;
    treatmentPackage: TreatmentPackage | null;
    employee?: Employee | null;
    treatmentType: TreatmentType;
    price: number;
}

export interface CustomerTransaction {
    id: number;
    customer: Customer;
    employee: Employee;
    actualPrice: number;
    voucherDiscountAmount: number;
    paymentMethod: PaymentMethod;
    notes: string;
    date: string;
    items: CustomerTransactionItem[];
}

export interface VoucherTemplate {
    id: number;
    name: string;
    description: string;
    discountType: VoucherDiscountType;
    discountValue: number;
    minimumTransaction: number;
    validityDays: number;
    neverExpires: boolean;
    appliesToAll: boolean;
    treatmentIds: number[];
    treatmentPackageIds: number[];
    active: boolean;
    createdAt: string;
}

export interface MemberVoucher {
    id: number;
    template: VoucherTemplate;
    customerId: number;
    customerName: string;
    code: string;
    assignedAt: string;
    expiresAt: string;
    neverExpires: boolean;
    status: MemberVoucherStatus;
    usedTransactionId?: number | null;
}

export interface VoucherTemplateRequest {
    name: string;
    description: string;
    discountType: VoucherDiscountType;
    discountValue: number;
    minimumTransaction: number;
    validityDays: number;
    appliesToAll: boolean;
    treatmentIds: number[];
    treatmentPackageIds: number[];
    active: boolean;
}

export interface AssignVoucherRequest {
    templateId: number;
    customerId: number;
}

export interface CustomerTreatmentRecord {
    id: number;
    customer: Customer;
    employee: Employee;
    treatment: Treatment | null;
    treatmentPackage: TreatmentPackage | null;
    actualPrice: number;
    paymentMethod: PaymentMethod;
    notes: string;
    date: string;
    memberVoucherId?: number | null;
}

export class TransactionItem {
    id: number;
    employee: Employee;
    time: string;
    customer: Customer;
    service: string;
    amount: number;
    status: string;
    originalRecord: CustomerTransaction | null;
    items: CartItem[];

    constructor(record?: CustomerTransaction | TransactionItem) {
        this.items = [];

        if (!record) {
            this.id = Date.now();
            this.time = formatDateTime(new Date());
            this.service = "";
            this.amount = 0;
            this.status = "LUNAS";
            this.originalRecord = null;

            this.customer = {} as Customer;

            this.employee = {
                id: 0,
                name: "",
                role: "",
                phoneNumber: "",
                active: true,
                password: ""
            } as Employee;

            return;
        }

        if (record.customer && typeof record.customer === "object" && Array.isArray(record.items)) {
            const raw = record as CustomerTransaction;

            this.id = raw.id;
            this.employee = raw.employee;
            this.time = raw.date;
            this.customer = raw.customer;
            this.status = "LUNAS";
            this.originalRecord = raw;
            this.amount = raw.actualPrice;

            this.items = [];
            const serviceNames: string[] = [];

            raw.items.forEach((item: CustomerTransactionItem) => {
                if (item.treatment && item.treatmentType === "Single") {
                    this.items.push({
                        id: item.treatment.id,
                        name: item.treatment.title,
                        price: item.price,
                        treatmentType: "Single",
                        employee: item.employee || raw.employee,
                        priceLabel: item.treatment.priceType
                    });

                    serviceNames.push(item.treatment.title);
                } else if (item.treatmentPackage && item.treatmentType === "Package") {
                    const detailNames = item.treatmentPackage.treatments
                        .map(t => t.title)
                        .join(", ");

                    this.items.push({
                        id: item.treatmentPackage.id,
                        name: item.treatmentPackage.title,
                        price: item.price,
                        treatmentType: "Package",
                        employee: item.employee || raw.employee,
                        details: detailNames
                    });

                    serviceNames.push(`[PAKET] ${item.treatmentPackage.title}`);
                } else {
                    // fallback kalau entah kenapa datanya nggak ada treatment/treatmentPackage
                    this.items.push({
                        id: item.id,
                        name: "Layanan tidak diketahui",
                        price: item.price,
                        treatmentType: "Single",
                        employee: item.employee || raw.employee
                    });

                    serviceNames.push("Unknown treatment/package");
                }
            });

            this.service = serviceNames.length > 0 ? serviceNames.join(", ") : "Treatment deleted";

            return;
        }

        const localRecord = record as TransactionItem;

        this.id = localRecord.id;
        this.employee = localRecord.employee;
        this.time = localRecord.time;
        this.customer = localRecord.customer;
        this.service = localRecord.service;
        this.amount = localRecord.amount;
        this.status = localRecord.status;
        this.items = localRecord.items || [];
        this.originalRecord = null;
    }
}

export interface TransactionItemRequest {
    treatmentType: TreatmentType;
    treatmentId: number | null;
    treatmentPackageId: number | null;
    price: number;
    employeeId?: number | null;
}

export interface TransactionRequest {
    employeeId: number;
    customer: {
        id?: number;
        name: string;
        phoneNumber?: string;
        birthDate?: string | null;
    };
    items: TransactionItemRequest[];
    actualPrice: number;
    paymentMethod: PaymentMethod;
    notes: string;
    date: string;
    memberVoucherId?: number | null;
}

export interface LegacyTransactionRequest {
    employeeId: number;
    commissionPercent: number;
    actualPrice: number;
    paymentMethod: PaymentMethod;
    notes: string;
    date: string;
}

export interface FinanceCategory {
    id: number;
    categoryId: string;
    name: string;
    kind: ExpenseKind;
    description: string;
    active: boolean;
    createdAt: string;
}

export interface FinanceCategoryRequest {
    categoryId: string;
    name: string;
    kind: ExpenseKind;
    description: string;
    active: boolean;
}

export interface FinanceExpense {
    id: number;
    date: string;
    categoryId: string;
    categoryName: string;
    kind: ExpenseKind;
    amount: number;
    paymentMethod: PaymentMethod;
    vendor: string;
    notes: string;
    receiptUrl: string;
    createdAt: string;
}

export interface FinanceExpenseRequest {
    date: string;
    categoryId: string;
    categoryName: string;
    kind: ExpenseKind;
    amount: number;
    paymentMethod: PaymentMethod;
    vendor: string;
    notes: string;
    receiptUrl: string;
}

export interface MonthlyBudget {
    id: number;
    month: string;
    categoryId: string;
    categoryName: string;
    kind: ExpenseKind;
    amount: number;
    createdAt: string;
}

export interface MonthlyBudgetRequest {
    month: string;
    categoryId: string;
    categoryName: string;
    kind: ExpenseKind;
    amount: number;
}

export interface RecurringExpense {
    id: number;
    name: string;
    categoryId: string;
    categoryName: string;
    kind: ExpenseKind;
    amount: number;
    paymentMethod: PaymentMethod;
    frequency: RecurringExpenseFrequency;
    startDate?: string | null;
    endDate?: string | null;
    nextDueDate: string;
    active: boolean;
    notes: string;
    createdAt: string;
}

export interface RecurringExpenseRequest {
    name: string;
    categoryId: string;
    categoryName: string;
    kind: ExpenseKind;
    amount: number;
    paymentMethod: PaymentMethod;
    frequency: RecurringExpenseFrequency;
    startDate: string;
    endDate?: string | null;
    nextDueDate?: string;
    active: boolean;
    notes: string;
}

export interface CashReconciliation {
    id: number;
    date: string;
    expectedCash: number;
    actualCash: number;
    difference: number;
    status: CashReconciliationStatus;
    cashierName: string;
    notes: string;
    createdAt: string;
}

export interface CashReconciliationRequest {
    date: string;
    actualCash: number;
    cashierName: string;
    notes: string;
}

export interface StaffPayroll {
    id: number | null;
    staff: Employee;
    month: string;
    dailySalary: number;
    workDays: number;
    dailySalaryTotal: number;
    baseSalary: number;
    commission: number;
    quarterlyRewardAmount: number;
    quarterlyRewardStartMonth: string;
    quarterlyRewardEligible: boolean;
    quarterlyReward: number;
    handledRevenue: number;
    handledTransactions: number;
    targetRevenue: number;
    targetReached: boolean;
    targetBonusAmount: number;
    targetBonusPaid: number;
    fridayBonusEnabled: boolean;
    fridayBonusAmount: number;
    fridayCount: number;
    fridayBonusTotal: number;
    payDate: string;
    paymentMethod: PaymentMethod;
    expenseCategoryId: string;
    expenseCategoryName: string;
    expenseKind: ExpenseKind;
    paid: boolean;
    paidAt?: string | null;
    financeExpenseId?: number | null;
    extraBonusTotal: number;
    bonuses: StaffPayrollBonus[];
    grossPay: number;
    deductionTotal: number;
    deductions: StaffPayrollDeduction[];
    totalPay: number;
    notes: string;
    generated: boolean;
}

export interface StaffPayrollBonus {
    id?: number;
    date: string;
    title: string;
    amount: number;
    notes: string;
}

export interface StaffPayrollDeduction {
    id?: number;
    date: string;
    title: string;
    amount: number;
    notes: string;
}

export interface StaffPayrollRequest {
    dailySalary: number;
    workDays: number;
    baseSalary: number;
    quarterlyReward: number;
    quarterlyRewardStartMonth: string;
    targetRevenue: number;
    targetBonusAmount: number;
    fridayBonusEnabled: boolean;
    fridayBonusAmount: number;
    payDate?: string | null;
    paymentMethod: PaymentMethod;
    expenseCategoryId?: string | null;
    expenseCategoryName?: string | null;
    expenseKind?: ExpenseKind | null;
    bonuses: StaffPayrollBonusRequest[];
    deductions: StaffPayrollDeductionRequest[];
    notes: string;
}

export interface StaffPayrollBonusRequest {
    clientKey?: string;
    date?: string | null;
    title: string;
    amount: number;
    notes: string;
}

export interface StaffPayrollDeductionRequest {
    clientKey?: string;
    date?: string | null;
    title: string;
    amount: number;
    notes: string;
}
