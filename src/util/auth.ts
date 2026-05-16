type AuthPayload = {
    role?: string;
    accessRole?: string;
};

function decodeBase64Url(value: string) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
    return atob(padded);
}

export function getAuthPayload(): AuthPayload | null {
    const token = localStorage.getItem("authToken");
    const payload = token?.split(".")[1];

    if (!payload) return null;

    try {
        return JSON.parse(decodeBase64Url(payload)) as AuthPayload;
    } catch (error) {
        console.error("Failed to decode auth token", error);
        return null;
    }
}

export function isAdminUser() {
    const accessRole = getAuthPayload()?.accessRole?.toLowerCase();
    return accessRole === "admin" || accessRole === "superadmin";
}
