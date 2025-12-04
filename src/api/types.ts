import {formatDateTime} from "../util/date";

export type TreatmentType = 'Single' | 'Package';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS';

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T | null;
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
    visitCount: number;
    totalVisitCount: number;
    lastVisitDate: string;
}

export interface Employee {
    id: number;
    name: string;
    username: string;
    password?: string;
    role: string;
    accessRole: string;
    phoneNumber: string;
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
    details?: string;
}

export interface CustomerTransactionItem {
    id: number;
    treatment: Treatment | null;
    treatmentPackage: TreatmentPackage | null;
    treatmentType: TreatmentType;
    price: number;
}

export interface CustomerTransaction {
    id: number;
    customer: Customer;
    employee: Employee;
    actualPrice: number;
    paymentMethod: PaymentMethod;
    notes: string;
    date: string;
    items: CustomerTransactionItem[];
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

    constructor(record?: CustomerTransaction | any) {
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
                username: "",
                role: "",
                accessRole: "",
                phoneNumber: "",
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
            this.amount = 0;

            this.items = [];
            const serviceNames: string[] = [];

            raw.items.forEach((item: CustomerTransactionItem) => {
                this.amount += item.price;

                if (item.treatment && item.treatmentType === "Single") {
                    this.items.push({
                        id: item.treatment.id,
                        name: item.treatment.title,
                        price: item.price,
                        treatmentType: "Single"
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
                        details: detailNames
                    });

                    serviceNames.push(`[PAKET] ${item.treatmentPackage.title}`);
                } else {
                    // fallback kalau entah kenapa datanya nggak ada treatment/treatmentPackage
                    this.items.push({
                        id: item.id,
                        name: "Layanan tidak diketahui",
                        price: item.price,
                        treatmentType: "Single"
                    });

                    serviceNames.push("Unknown treatment/package");
                }
            });

            this.service = serviceNames.length > 0 ? serviceNames.join(", ") : "Treatment deleted";

            return;
        }

        this.id = record.id;
        this.employee = record.employee;
        this.time = record.time;
        this.customer = record.customer;
        this.service = record.service;
        this.amount = record.amount;
        this.status = record.status;
        this.items = record.items || [];
        this.originalRecord = null;
    }
}

export interface TransactionItemRequest {
    treatmentType: TreatmentType;
    treatmentId: number | null;
    treatmentPackageId: number | null;
    price: number;
}

export interface TransactionRequest {
    employeeId: number;
    customer: {
        id?: number;
        name: string;
        phoneNumber?: string;
    };
    items: TransactionItemRequest[];
    actualPrice: number;
    paymentMethod: PaymentMethod;
    notes: string;
    date: string;
}
