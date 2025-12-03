import type {
    TreatmentCategory,
    Treatment,
    TreatmentPackage,
    Customer,
    Employee,
    CustomerTreatmentRecord
} from "../api/types.ts";

export const MOCK_CATEGORIES: TreatmentCategory[] = [
    {
        id: 2,
        title: "Perawatan Rambut",
        subTitle: "",
        notes: []
    },
    {
        id: 3,
        title: "Perawatan Badan",
        subTitle: "",
        notes: []
    },
    {
        id: 4,
        title: "Perawatan Facial Acne",
        subTitle: "",
        notes: []
    },
    {
        id: 5,
        title: "Perawatan Facial Brightening & Anti Aging",
        subTitle: "",
        notes: []
    },
    {
        id: 6,
        title: "Paket Hemat Shafwah",
        subTitle: "",
        notes: ["Free Ice Tea/Hot Tea"]
    }
];

export const MOCK_TREATMENTS: Treatment[] = [
    {
        id: 1,
        category: MOCK_CATEGORIES[0],
        title: "Gunting rambut",
        active: true,
        priceType: "Fixed",
        prices: [20000.0]
    },
    {
        id: 2,
        category: MOCK_CATEGORIES[0],
        title: "Gunting Blow Dry",
        active: true,
        priceType: "Fixed",
        prices: [25000.0]
    },
    {
        id: 3,
        category: MOCK_CATEGORIES[0],
        title: "Gunting Cuci Blow Dry",
        active: true,
        priceType: "Fixed",
        prices: [35000.0]
    },
    {
        id: 4,
        category: MOCK_CATEGORIES[0],
        title: "Poni",
        active: true,
        priceType: "Fixed",
        prices: [15000.0]
    },
    {
        id: 5,
        category: MOCK_CATEGORIES[0],
        title: "Cuci Blow Dry",
        active: true,
        priceType: "Fixed",
        prices: [25000.0]
    },
    {
        id: 6,
        category: MOCK_CATEGORIES[0],
        title: "Curly / Blow Tarik",
        active: true,
        priceType: "Range",
        prices: [50000.0, 75000.0]
    },
    {
        id: 7,
        category: MOCK_CATEGORIES[0],
        title: "Catok + Vitamin",
        active: true,
        priceType: "Option",
        prices: [40000.0, 55000.0, 75000.0]
    },
    {
        id: 8,
        category: MOCK_CATEGORIES[0],
        title: "Creambath Anak (2-7 tahun)",
        active: true,
        priceType: "Option",
        prices: [40000.0, 50000.0]
    },
    {
        id: 9,
        category: MOCK_CATEGORIES[0],
        title: "Creambath A Plus Pijat Bahu Dada",
        active: true,
        priceType: "Option",
        prices: [60000.0, 65000.0, 70000.0]
    },
    {
        id: 10,
        category: MOCK_CATEGORIES[0],
        title: "Creambath B",
        active: true,
        priceType: "Option",
        prices: [50000.0, 55000.0]
    },
    {
        id: 11,
        category: MOCK_CATEGORIES[0],
        title: "Hair Spa A, Plus Pijat Bahu Dada",
        active: true,
        priceType: "Option",
        prices: [70000.0, 75000.0, 80000.0]
    },
    {
        id: 12,
        category: MOCK_CATEGORIES[0],
        title: "Hair Spa B",
        active: true,
        priceType: "Option",
        prices: [65000.0, 75000.0]
    },
    {
        id: 13,
        category: MOCK_CATEGORIES[0],
        title: "Hair Mask Natural Non Pijat",
        active: true,
        priceType: "Option",
        prices: [60000.0, 65000.0, 75000.0]
    },
    {
        id: 14,
        category: MOCK_CATEGORIES[0],
        title: "Hair Mask Keratin/Matrix Non Pijat",
        active: true,
        priceType: "Option",
        prices: [100000.0, 110000.0, 125000.0]
    },
    {
        id: 15,
        category: MOCK_CATEGORIES[0],
        title: "Cat Rambut",
        active: true,
        priceType: "Range",
        prices: [90000.0, 300000.0]
    },
    {
        id: 16,
        category: MOCK_CATEGORIES[0],
        title: "Bleaching Rambut",
        active: true,
        priceType: "Range",
        prices: [150000.0, 350000.0]
    },
    {
        id: 17,
        category: MOCK_CATEGORIES[0],
        title: "Smoothing (Offer Tebal, Panjang + 100)",
        active: true,
        priceType: "Range",
        prices: [250000.0, 500000.0]
    },
    {
        id: 18,
        category: MOCK_CATEGORIES[0],
        title: "Teraphy Oxygen Rambut",
        active: true,
        priceType: "Range",
        prices: [150000.0, 200000.0]
    },
    {
        id: 19,
        category: MOCK_CATEGORIES[1],
        title: "Pijat Tangan",
        active: true,
        priceType: "Fixed",
        prices: [15000.0]
    },
    {
        id: 20,
        category: MOCK_CATEGORIES[1],
        title: "Ratus V",
        active: true,
        priceType: "Fixed",
        prices: [40000.0]
    },
    {
        id: 21,
        category: MOCK_CATEGORIES[1],
        title: "Kerik Badan",
        active: true,
        priceType: "Fixed",
        prices: [30000.0]
    },
    {
        id: 22,
        category: MOCK_CATEGORIES[1],
        title: "Lulur (body scrub)",
        active: true,
        priceType: "Fixed",
        prices: [85000.0]
    },
    {
        id: 23,
        category: MOCK_CATEGORIES[1],
        title: "Masker Badan",
        active: true,
        priceType: "Fixed",
        prices: [80000.0]
    },
    {
        id: 24,
        category: MOCK_CATEGORIES[1],
        title: "Full Body Massage",
        active: true,
        priceType: "Fixed",
        prices: [85000.0]
    },
    {
        id: 25,
        category: MOCK_CATEGORIES[1],
        title: "Bleaching Badan",
        active: true,
        priceType: "Fixed",
        prices: [100000.0]
    },
    {
        id: 26,
        category: MOCK_CATEGORIES[1],
        title: "Pedicure + Spa Kaki + Vitamin Kuku",
        active: true,
        priceType: "Fixed",
        prices: [80000.0]
    },
    {
        id: 27,
        category: MOCK_CATEGORIES[1],
        title: "Manicure + Massage Jari + Vitamin Kuku",
        active: true,
        priceType: "Fixed",
        prices: [60000.0]
    },
    {
        id: 28,
        category: MOCK_CATEGORIES[1],
        title: "Paket Manicure + Pedicure + Vit",
        active: true,
        priceType: "Fixed",
        prices: [130000.0]
    },
    {
        id: 29,
        category: MOCK_CATEGORIES[1],
        title: "Body Steam/Sauna (+ Rempah 10k)",
        active: true,
        priceType: "Fixed",
        prices: [35000.0]
    },
    {
        id: 30,
        category: MOCK_CATEGORIES[1],
        title: "Makeup Simple/Wisuda, Mulai Dari",
        active: true,
        priceType: "Fixed",
        prices: [200000.0]
    },
    {
        id: 31,
        category: MOCK_CATEGORIES[1],
        title: "Menyewakan Baju Kartinian, Mulai Dari",
        active: true,
        priceType: "Fixed",
        prices: [80000.0]
    },
    {
        id: 32,
        category: MOCK_CATEGORIES[2],
        title: "Only Mask Acne",
        active: true,
        priceType: "Fixed",
        prices: [45000.0]
    },
    {
        id: 33,
        category: MOCK_CATEGORIES[2],
        title: "Facial Acne, Tea Tree Oil",
        active: true,
        priceType: "Fixed",
        prices: [95000.0]
    },
    {
        id: 34,
        category: MOCK_CATEGORIES[2],
        title: "Facial Oxy Acne",
        active: true,
        priceType: "Fixed",
        prices: [125000.0]
    },
    {
        id: 35,
        category: MOCK_CATEGORIES[2],
        title: "Facial Laser IPL Acne",
        active: true,
        priceType: "Fixed",
        prices: [150000.0]
    },
    {
        id: 36,
        category: MOCK_CATEGORIES[3],
        title: "Totok Aura Wajah",
        active: true,
        priceType: "Fixed",
        prices: [50000.0]
    },
    {
        id: 37,
        category: MOCK_CATEGORIES[3],
        title: "Paket Masker + Totok Aura Wajah",
        active: true,
        priceType: "Fixed",
        prices: [65000.0]
    },
    {
        id: 38,
        category: MOCK_CATEGORIES[3],
        title: "Facial Whitening",
        active: true,
        priceType: "Fixed",
        prices: [95000.0]
    },
    {
        id: 39,
        category: MOCK_CATEGORIES[3],
        title: "Facial Detox Glow",
        active: true,
        priceType: "Fixed",
        prices: [125000.0]
    },
    {
        id: 40,
        category: MOCK_CATEGORIES[3],
        title: "Facial Oxy Glow",
        active: true,
        priceType: "Fixed",
        prices: [125000.0]
    },
    {
        id: 41,
        category: MOCK_CATEGORIES[3],
        title: "Facial Microdermabrasi",
        active: true,
        priceType: "Fixed",
        prices: [125000.0]
    },
    {
        id: 42,
        category: MOCK_CATEGORIES[3],
        title: "Facial IPL Rejuve",
        active: true,
        priceType: "Fixed",
        prices: [150000.0]
    },
    {
        id: 43,
        category: MOCK_CATEGORIES[3],
        title: "Facial RF/Lifting",
        active: true,
        priceType: "Fixed",
        prices: [150000.0]
    },
    {
        id: 44,
        category: MOCK_CATEGORIES[3],
        title: "Facial Dermapen + Soft Peel",
        active: true,
        priceType: "Fixed",
        prices: [185000.0]
    },
    {
        id: 45,
        category: MOCK_CATEGORIES[3],
        title: "Facial CC Glow",
        active: true,
        priceType: "Fixed",
        prices: [240000.0]
    }
];

export const MOCK_PACKAGES: TreatmentPackage[] = [
    {
        id: 2,
        category: MOCK_CATEGORIES[4], // Paket Hemat Shafwah
        title: "Paket Shafwah 1",
        price: 150000.0,
        active: true,
        treatments: [
            MOCK_TREATMENTS[21], // Lulur (ID 22, Index 21)
            MOCK_TREATMENTS[23]  // Full Body Massage (ID 24, Index 23)
        ]
    },
    {
        id: 3,
        category: MOCK_CATEGORIES[4],
        title: "Paket Shafwah 2",
        price: 185000.0,
        active: true,
        treatments: [
            MOCK_TREATMENTS[9],  // Creambath B (ID 10, Index 9)
            MOCK_TREATMENTS[35], // Totok Aura Wajah (ID 36, Index 35)
            MOCK_TREATMENTS[37]  // Facial Whitening (ID 38, Index 37)
        ]
    },
    {
        id: 4,
        category: MOCK_CATEGORIES[4],
        title: "Paket Shafwah 3",
        price: 190000.0,
        active: true,
        treatments: [
            MOCK_TREATMENTS[9],  // Creambath B
            MOCK_TREATMENTS[21], // Lulur
            MOCK_TREATMENTS[23]  // Full Body Massage
        ]
    },
    {
        id: 5,
        category: MOCK_CATEGORIES[4],
        title: "Paket Shafwah 4",
        price: 195000.0,
        active: true,
        treatments: [
            MOCK_TREATMENTS[11], // Hair Spa B (ID 12, Index 11)
            MOCK_TREATMENTS[19], // Ratus V (ID 20, Index 19)
            MOCK_TREATMENTS[37]  // Facial Whitening
        ]
    },
    {
        id: 6,
        category: MOCK_CATEGORIES[4],
        title: "Paket Shafwah 5",
        price: 195000.0,
        active: true,
        treatments: [
            MOCK_TREATMENTS[35], // Totok Aura
            MOCK_TREATMENTS[38], // Facial Detox (ID 39, Index 38)
            MOCK_TREATMENTS[39]  // Facial Oxy (ID 40, Index 39)
        ]
    },
    {
        id: 7,
        category: MOCK_CATEGORIES[4],
        title: "Paket Shafwah 6",
        price: 250000.0,
        active: true,
        treatments: [
            MOCK_TREATMENTS[9],  // Creambath B
            MOCK_TREATMENTS[19], // Ratus V
            MOCK_TREATMENTS[21], // Lulur
            MOCK_TREATMENTS[37]  // Facial Whitening
        ]
    }
];

export const MOCK_EMPLOYEES: Employee[] = [
    {
        id: 1,
        name: "Yang Ruikee",
        username: "ruikee",
        role: "STYLIST",
        accessRole: "SERVICE",
        phoneNumber: "081234567890"
    },
    {
        id: 2,
        name: "啊YueYue",
        username: "yueyue",
        role: "STYLIST",
        accessRole: "SERVICE",
        phoneNumber: "089876543210"
    },
    {
        id: 3,
        name: "Ju Jingyi",
        username: "jingyi",
        role: "ADMIN",
        accessRole: "ALL",
        phoneNumber: "085678901234"
    },
    {
        id: 4,
        name: "钱影啊",
        username: "qianying",
        role: "STYLIST",
        accessRole: "SERVICE",
        phoneNumber: "081112223334"
    },
    {
        id: 5,
        name: "平生不晚",
        username: "pingsheng",
        role: "CASHIER",
        accessRole: "POS",
        phoneNumber: "088899977766"
    }
];

export const MOCK_CUSTOMERS: Customer[] = [
    {
        id: 1,
        name: "张伟",
        phoneNumber: "081122334455",
        address: "Jl. Mawar No. 10",
        visitCount: 5,
        totalVisitCount: 12,
        lastVisitDate: "2024-11-20"
    },
    {
        id: 2,
        name: "李娜",
        phoneNumber: "081299887766",
        address: "Komp. Melati Indah",
        visitCount: 2,
        totalVisitCount: 2,
        lastVisitDate: "2024-12-01"
    },
    {
        id: 3,
        name: "王芳",
        phoneNumber: "085544332211",
        address: "Jl. Anggrek Raya",
        visitCount: 15,
        totalVisitCount: 30,
        lastVisitDate: "2024-11-25"
    },
    {
        id: 4,
        name: "刘洋",
        phoneNumber: "087766554433",
        address: "Apartemen City View",
        visitCount: 1,
        totalVisitCount: 1,
        lastVisitDate: "2024-12-02"
    },
    {
        id: 5,
        name: "陈静",
        phoneNumber: "081234567890",
        address: "Jl. Sudirman No. 5",
        visitCount: 8,
        totalVisitCount: 20,
        lastVisitDate: "2024-11-30"
    },
    {
        id: 6,
        name: "杨敏",
        phoneNumber: "089876543211",
        address: "Jl. Gatot Subroto",
        visitCount: 3,
        totalVisitCount: 5,
        lastVisitDate: "2024-12-03"
    }
];

export const MOCK_RECORDS: CustomerTreatmentRecord[] = [
    {
        id: 101,
        customer: MOCK_CUSTOMERS[0],
        employee: MOCK_EMPLOYEES[0],
        treatment: MOCK_TREATMENTS[0],
        treatmentPackage: null,
        actualPrice: 20000,
        paymentMethod: "CASH",
        notes: "Potong pendek rapi",
        date: "2024-12-02 14:30"
    },
    {
        id: 102,
        customer: MOCK_CUSTOMERS[1],
        employee: MOCK_EMPLOYEES[1],
        treatment: null,
        treatmentPackage: MOCK_PACKAGES[0],
        actualPrice: 150000,
        paymentMethod: "QRIS",
        notes: "",
        date: "2024-12-02 13:15"
    },
    {
        id: 103,
        customer: MOCK_CUSTOMERS[2],
        employee: MOCK_EMPLOYEES[3],
        treatment: MOCK_TREATMENTS[25],
        treatmentPackage: null,
        actualPrice: 35000,
        paymentMethod: "CASH",
        notes: "",
        date: "2024-12-02 11:00"
    },
    {
        id: 104,
        customer: MOCK_CUSTOMERS[0],
        employee: MOCK_EMPLOYEES[0],
        treatment: MOCK_TREATMENTS[21],
        treatmentPackage: null,
        actualPrice: 85000,
        paymentMethod: "CASH",
        notes: "",
        date: "2024-11-20 10:00"
    }
];