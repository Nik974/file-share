import { useState, useRef } from 'react'
import axios from 'axios'
import {
    Box, Button, Card, CardContent, Typography,
    Alert, Chip, CircularProgress
} from '@mui/material'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import { List, ListItem, ListItemText, Divider } from '@mui/material'
const API = '/api/file'

export default function ReceivePage() {
    const [digits, setDigits] = useState(['', '', '', '', '', ''])
    const [fileInfo, setFileInfo] = useState(null)
    const [loading, setLoading] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [error, setError] = useState(null)
    const refs = useRef([])

    const code = digits.join('')

    const handleDigitChange = (i, val) => {
        const v = val.replace(/\D/g, '').slice(-1)
        const next = [...digits]
        next[i] = v
        setDigits(next)
        setError(null)
        setFileInfo(null)
        if (v && i < 5) refs.current[i + 1]?.focus()
    }

    const handleKeyDown = (i, e) => {
        if (e.key === 'Backspace' && !digits[i] && i > 0) {
            refs.current[i - 1]?.focus()
        }
        if (e.key === 'Enter' && code.length === 6) checkCode()
    }

    const handlePaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        if (pasted.length === 6) {
            setDigits(pasted.split(''))
            refs.current[5]?.focus()
            setError(null)
            setFileInfo(null)
        }
        e.preventDefault()
    }

    const checkCode = async () => {
        if (code.length !== 6) return
        setLoading(true)
        setError(null)
        setFileInfo(null)
        try {
            const res = await axios.get(`${API}/${code}`)
            setFileInfo(res.data)
        } catch (err) {
            setError(err.response?.data?.error ?? 'Błąd podczas sprawdzania kodu.')
        } finally {
            setLoading(false)
        }
    }

    const download = async () => {
        setDownloading(true)
        setError(null)
        try {
            const res = await fetch(`${API}/${code}/download`)
            if (!res.ok) { setError('Plik niedostępny — mógł już zostać pobrany lub wygasł.'); return }
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = fileInfo.fileName
            link.click()
            window.URL.revokeObjectURL(url)
            setFileInfo(null)
            setDigits(['', '', '', '', '', ''])
        } catch {
            setError('Błąd podczas pobierania pliku.')
        } finally {
            setDownloading(false)
        }
    }

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const formatExpiry = (isoString) => new Date(isoString).toLocaleTimeString('pl-PL', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    })

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                {digits.map((d, i) => (
                    <Box
                        key={i}
                        component="input"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        ref={el => refs.current[i] = el}
                        onChange={e => handleDigitChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        onPaste={handlePaste}
                        sx={{
                            width: { xs: 44, sm: 56 },
                            height: { xs: 56, sm: 68 },
                            textAlign: 'center',
                            fontSize: { xs: 24, sm: 28 },
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            border: '2px solid',
                            borderColor: d ? 'primary.main' : 'divider',
                            borderRadius: 3,
                            bgcolor: 'background.paper',
                            color: 'text.primary',
                            outline: 'none',
                            transition: 'border-color 0.15s',
                            '&:focus': { borderColor: 'primary.main', boxShadow: '0 0 0 3px rgba(25,118,210,0.15)' },
                        }}
                    />
                ))}
            </Box>

            <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={code.length !== 6 || loading}
                onClick={checkCode}
                sx={{ py: 1.5, maxWidth: 200, alignSelf: 'center' }}
            >
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Sprawdź kod'}
            </Button>

            {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}

            {fileInfo && (
                <Card variant="outlined" sx={{ borderRadius: 4 }}>
                    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="body2" fontWeight={600}>
                                {fileInfo.fileCount === 1 ? '1 plik' : `${fileInfo.fileCount} pliki`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Wygasa o {formatExpiry(fileInfo.expiresAt)}
                            </Typography>
                        </Box>
                        <List disablePadding sx={{ mb: 2 }}>
                            {fileInfo.files.map((f, i) => (
                                <Box key={i}>
                                    <ListItem disablePadding sx={{ py: 0.5 }}>
                                        <InsertDriveFileOutlinedIcon sx={{ fontSize: 20, color: 'primary.main', mr: 1.5 }} />
                                        <ListItemText
                                            primary={f.originalName}
                                            secondary={formatSize(f.fileSize)}
                                            primaryTypographyProps={{ variant: 'body2', fontWeight: 500, noWrap: true }}
                                            secondaryTypographyProps={{ variant: 'caption' }}
                                        />
                                    </ListItem>
                                    {i < fileInfo.files.length - 1 && <Divider />}
                                </Box>
                            ))}
                        </List>
                        <Button
                            variant="contained"
                            fullWidth
                            startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadOutlinedIcon />}
                            disabled={downloading}
                            onClick={download}
                        >
                            {downloading ? 'Pobieranie...' : fileInfo.fileCount === 1 ? 'Pobierz plik' : 'Pobierz wszystkie jako ZIP'}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </Box>
    )
}