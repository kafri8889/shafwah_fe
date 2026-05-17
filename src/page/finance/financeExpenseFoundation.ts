export type ExpenseKind = "FIXED" | "VARIABLE" | "ONE_TIME";

export type ExpenseCategory = {
    id: string;
    name: string;
    kind: ExpenseKind;
    budget: number;
    actual: number;
    description: string;
};

export type ExpenseSummary = {
    budget: number;
    actual: number;
    remainingBudget: number;
    categoryCount: number;
};

export const expenseCategories: ExpenseCategory[] = [
    {
        id: "products",
        name: "Produk & bahan",
        kind: "VARIABLE",
        budget: 0,
        actual: 0,
        description: "Cream, shampoo, masker, obat treatment, consumable salon."
    },
    {
        id: "salary",
        name: "Gaji non-komisi",
        kind: "FIXED",
        budget: 0,
        actual: 0,
        description: "Gaji pokok, uang makan, allowance, atau payroll di luar komisi."
    },
    {
        id: "rent",
        name: "Sewa & tempat",
        kind: "FIXED",
        budget: 0,
        actual: 0,
        description: "Sewa tempat, IPL, maintenance ruangan, dan biaya tempat lain."
    },
    {
        id: "utilities",
        name: "Listrik, air, internet",
        kind: "FIXED",
        budget: 0,
        actual: 0,
        description: "Tagihan rutin operasional salon."
    },
    {
        id: "marketing",
        name: "Marketing & promo",
        kind: "VARIABLE",
        budget: 0,
        actual: 0,
        description: "Iklan, konten, endorsement, diskon campaign di luar voucher."
    },
    {
        id: "petty_cash",
        name: "Petty cash",
        kind: "ONE_TIME",
        budget: 0,
        actual: 0,
        description: "Belanja kecil harian dan koreksi kas."
    }
];

export function buildExpenseSummary(categories: ExpenseCategory[]): ExpenseSummary {
    const budget = categories.reduce((sum, category) => sum + category.budget, 0);
    const actual = categories.reduce((sum, category) => sum + category.actual, 0);

    return {
        budget,
        actual,
        remainingBudget: budget - actual,
        categoryCount: categories.length
    };
}

export function getExpenseStatus(category: ExpenseCategory) {
    if (category.budget <= 0 && category.actual <= 0) return "Belum diisi";
    if (category.budget <= 0 && category.actual > 0) return "Tanpa budget";
    if (category.actual > category.budget) return "Melebihi budget";
    if (category.actual >= category.budget * 0.85) return "Mendekati budget";
    return "Aman";
}
