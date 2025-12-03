import { Button, TextField, Paper } from "@mui/material";
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
        <Paper sx={{ p: 3, maxWidth: 380, mx: "auto", mt: 8 }}>
            <Toaster/>
            <TextField
                id="textfield-username"
                label="Username"
                variant="outlined"
                fullWidth margin="normal"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />

            <TextField
                label="Password"
                fullWidth
                margin="normal"
                type="password"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <Button
                type="submit"
                variant="contained"
                fullWidth={true}
                sx={{ mt: 2, borderRadius: 999 }}
                disabled={loading}
                onClick={requestLogin}
            >
                Login
            </Button>
        </Paper>
    );
}
