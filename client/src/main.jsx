import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { useState, useMemo } from 'react'
import App from './App'

function Root() {
    const [mode, setMode] = useState(() =>
        window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    )

    const theme = useMemo(() => createTheme({
        palette: {
            mode,
            primary: { main: '#1976D2' },
            secondary: { main: '#1565C0' },
            ...(mode === 'dark' ? {
                background: { default: '#0F1923', paper: '#162230' },
            } : {
                background: { default: '#F3F7FB', paper: '#FFFFFF' },
            }),
        },
        shape: { borderRadius: 16 },
        typography: { fontFamily: '"Google Sans", "Roboto", sans-serif' },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: { borderRadius: 50, textTransform: 'none', fontWeight: 500, fontSize: 14, padding: '10px 24px' },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        borderRadius: 28,
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                    }),
                },
            },
            MuiCardContent: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                    }),
                },
            },
            MuiAlert: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        backgroundColor: theme.palette.mode === 'dark' ? '#1a2a1a' : undefined,
                    }),
                },
            },
        },
    }), [mode])

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App mode={mode} setMode={setMode} />
        </ThemeProvider>
    )
}

createRoot(document.getElementById('root')).render(
    <StrictMode><Root /></StrictMode>
)