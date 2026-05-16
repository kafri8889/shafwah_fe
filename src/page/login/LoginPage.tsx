import {Box, Button, Chip, Divider, Paper, Stack, TextField, Typography} from "@mui/material";
import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {login} from "../../api/service/authService.ts";
import toast, {Toaster} from "react-hot-toast";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    async function requestLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await login({ username, password });

            if (!response.success || !response.data) {
                toast.error(response.message || "Login failed");
                return;
            }

            localStorage.setItem("authToken", response.data);

            navigate("/dashboard", { replace: true });
        } catch (err) {
            console.error(err);
            toast.error("Login failed. " + err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box className="page-shell" sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
            <Toaster />
            <Paper
                elevation={0}
                sx={{
                    width: "100%",
                    maxWidth: 920,
                    borderRadius: 1,
                    border: "1px solid rgba(233, 221, 208, 0.8)",
                    overflow: "hidden",
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" },
                    background: "rgba(255, 248, 240, 0.9)"
                }}
            >
                <Box
                    sx={{
                        p: { xs: 4, md: 6 },
                        background: "linear-gradient(140deg, rgba(196, 112, 93, 0.15), rgba(255, 248, 240, 0.95))",
                        minHeight: 320
                    }}
                >
                    <Stack spacing={2}>
                        <Typography variant="overline" color="text.secondary">
                            Salon Muslimah Shafwah
                        </Typography>
                        <Typography variant="h3">Selamat datang kembali</Typography>
                        <Typography variant="body1" color="text.secondary">
                            Masuk untuk mengelola transaksi, memantau performa, dan menjaga pengalaman terbaik pelanggan.
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip label="Kasir" color="secondary" />
                            <Chip label="Laporan Harian" color="secondary" variant="outlined" />
                            <Chip label="Manajemen Layanan" color="secondary" variant="outlined" />
                        </Stack>
                    </Stack>
                </Box>
                <Box sx={{ p: { xs: 4, md: 5 }, display: "flex", alignItems: "center" }}>
                    <Box component="form" onSubmit={requestLogin} sx={{ width: "100%" }}>
                        <Stack spacing={2.5}>
                            <Box>
                                <Typography variant="h5">Masuk</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Gunakan akun staff yang sudah terdaftar.
                                </Typography>
                            </Box>
                            <Divider />
                            <TextField
                                id="textfield-username"
                                label="Username"
                                variant="outlined"
                                fullWidth
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />

                            <TextField
                                label="Password"
                                fullWidth
                                type="password"
                                variant="outlined"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={loading}
                                sx={{ py: 1.4 }}
                            >
                                {loading ? "Masuk..." : "Masuk ke Dashboard"}
                            </Button>
                        </Stack>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}
