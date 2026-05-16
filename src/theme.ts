import {createTheme} from "@mui/material/styles";

const baseTheme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#B47B4C",
            dark: "#8F5E36",
            light: "#D6A675"
        },
        secondary: {
            main: "#C4705D",
            dark: "#9E5344",
            light: "#DDA394"
        },
        success: {
            main: "#6C8A6C"
        },
        warning: {
            main: "#D1A45E"
        },
        background: {
            default: "#F6EFE7",
            paper: "#FFF8F0"
        },
        text: {
            primary: "#3A2F2A",
            secondary: "#7A6A62"
        },
        divider: "#E9DDD0"
    },
    shape: {
        borderRadius: 1
    },
    typography: {
        fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
        h1: {
            fontFamily: '"Fraunces", "Times New Roman", serif',
            fontWeight: 600,
            letterSpacing: "-0.02em"
        },
        h2: {
            fontFamily: '"Fraunces", "Times New Roman", serif',
            fontWeight: 600,
            letterSpacing: "-0.02em"
        },
        h3: {
            fontFamily: '"Fraunces", "Times New Roman", serif',
            fontWeight: 600,
            letterSpacing: "-0.02em"
        },
        h4: {
            fontFamily: '"Fraunces", "Times New Roman", serif',
            fontWeight: 600,
            letterSpacing: "-0.01em"
        },
        h5: {
            fontFamily: '"Fraunces", "Times New Roman", serif',
            fontWeight: 600
        },
        h6: {
            fontFamily: '"Fraunces", "Times New Roman", serif',
            fontWeight: 600
        },
        button: {
            textTransform: "none",
            fontWeight: 600
        }
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 1,
                    paddingInline: 18,
                    paddingBlock: 10,
                    boxShadow: "none"
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: "0 8px 24px rgba(60, 47, 42, 0.08)",
                    border: "1px solid rgba(233, 221, 208, 0.7)"
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: "none",
                    borderRadius: 1
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 1,
                    fontWeight: 600
                }
            }
        },
        MuiTableHead: {
            styleOverrides: {
                root: {
                    backgroundColor: "rgba(255, 248, 240, 0.9)"
                }
            }
        }
    }
});

export const lightTheme = baseTheme;
export const darkTheme = baseTheme;
