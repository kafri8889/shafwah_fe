import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { lightTheme, darkTheme } from "./theme.ts";

const useDark = false; // TODO: nanti bikin toogllenau
const theme = useDark ? darkTheme : lightTheme;

document.body.classList.add(useDark ? "dark" : "light");

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <App />
            </ThemeProvider>
        </BrowserRouter>
    </React.StrictMode>
);
