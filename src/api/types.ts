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
    id: number;
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

export interface CustomerTreatmentRecord {
    id: number;
    customer: Customer;
    employee: Employee;
    treatment: Treatment | null; // Null karena bisa jadi beli paket
    treatmentPackage: TreatmentPackage | null; // Null karena bisa jadi beli satuan
    actualPrice: number;
    paymentMethod: string;
    notes: string;
    date: string;
}

export interface EmployeeResponse {
    id: number;
    name: string;
    username: string;
    role: string;
    accessRole: string;
    phoneNumber: string;
}

export interface LoginResponse {
    token: string;
    user: Employee;
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

export interface CustomerTreatmentRecordRequest {
    customerId: number;
    employeeId: number;
    treatmentId: number | null;
    treatmentPackageId: number | null;
    actualPrice: number;
    paymentMethod: string;
    notes: string;
    date: string;
}

export interface CartItem {
    id: number;
    name: string;
    price: number;
    type: 'TREATMENT' | 'PACKAGE';
    details?: string;
}

export class TransactionItem {
    id: number;
    time: string;
    customer: string;
    service: string;
    amount: number;
    status: string;
    originalRecord: CustomerTreatmentRecord | null;
    items: CartItem[];

    constructor(record?: CustomerTreatmentRecord | any) {
        this.items = [];

        if (!record) {
            this.id = Date.now();
            this.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            this.customer = "";
            this.service = "";
            this.amount = 0;
            this.status = "LUNAS";
            this.originalRecord = null;
        } else if (record.customer && typeof record.customer === 'object') {
            // Backend
            const raw = record as CustomerTreatmentRecord;
            this.id = raw.id;
            this.time = raw.date.split(" ")[1] || "00:00";
            this.customer = raw.customer.name;
            this.status = "LUNAS";
            this.originalRecord = raw;
            this.amount = raw.actualPrice;

            if (raw.treatment) {
                this.service = raw.treatment.title;
                this.items.push({
                    id: raw.treatment.id,
                    name: raw.treatment.title,
                    price: raw.actualPrice,
                    type: 'TREATMENT'
                });
            } else if (raw.treatmentPackage) {
                this.service = `[PAKET] ${raw.treatmentPackage.title}`;
                const detailNames = raw.treatmentPackage.treatments.map(t => t.title).join(", ");
                this.items.push({
                    id: raw.treatmentPackage.id,
                    name: raw.treatmentPackage.title,
                    price: raw.actualPrice,
                    type: 'PACKAGE',
                    details: detailNames
                });
            } else {
                this.service = "Layanan dihapus";
            }

        } else {
            // Form Manual
            this.id = record.id;
            this.time = record.time;
            this.customer = record.customer;
            this.service = record.service;
            this.amount = record.amount;
            this.status = record.status;
            this.items = record.items || [];
            this.originalRecord = null;
        }
    }
}