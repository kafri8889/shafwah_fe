/**
 * Helpers for resolving date range presets to ISO `YYYY-MM-DD` bounds.
 *
 * The backend `/paged` endpoints accept inclusive `startDate` and `endDate`
 * params formatted as `YYYY-MM-DD`. When a preset is `all`, both bounds are
 * undefined so the backend returns the full range.
 */

export type RangePreset =
    | "today"
    | "7d"
    | "30d"
    | "month"
    | "year"
    | "90d"
    | "all"
    | "custom";

export interface ResolvedRange {
    startDate?: string;
    endDate?: string;
}

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Resolves a [RangePreset] plus optional custom dates into ISO date strings.
 *
 * Returns an empty object when the preset is `all` or when `custom` is used
 * with missing bounds; this signals the caller to send no date filter.
 */
export function resolveDateRange(
    preset: RangePreset,
    customStart?: string,
    customEnd?: string
): ResolvedRange {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
        case "today":
            return { startDate: formatLocalDate(today), endDate: formatLocalDate(today) };
        case "7d": {
            const start = new Date(today);
            start.setDate(today.getDate() - 6);
            return { startDate: formatLocalDate(start), endDate: formatLocalDate(today) };
        }
        case "30d": {
            const start = new Date(today);
            start.setDate(today.getDate() - 29);
            return { startDate: formatLocalDate(start), endDate: formatLocalDate(today) };
        }
        case "90d": {
            const start = new Date(today);
            start.setDate(today.getDate() - 89);
            return { startDate: formatLocalDate(start), endDate: formatLocalDate(today) };
        }
        case "month": {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return { startDate: formatLocalDate(start), endDate: formatLocalDate(end) };
        }
        case "year": {
            const start = new Date(today.getFullYear(), 0, 1);
            const end = new Date(today.getFullYear(), 11, 31);
            return { startDate: formatLocalDate(start), endDate: formatLocalDate(end) };
        }
        case "custom":
            if (customStart && customEnd) {
                return { startDate: customStart, endDate: customEnd };
            }
            return {};
        case "all":
        default:
            return {};
    }
}
