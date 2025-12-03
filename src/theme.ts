import { createTheme } from "@mui/material/styles";

export const lightTheme = createTheme({
    palette: {
        mode: "light",
    },
    shape: {
        borderRadius: 12,
    },
});

export const darkTheme = createTheme({
    palette: {
        mode: "dark",
    },
    shape: {
        borderRadius: 12,
    },
});
