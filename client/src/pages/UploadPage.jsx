import { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import {
    Box, Button, Card, CardContent, Typography,
    LinearProgress, Alert, Chip, IconButton, List,
    ListItem, ListItemText, ListItemSecondaryAction, Divider
} from '@mui/material'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import CloseIcon from '@mui/icons-material/Close'

const MAX_SIZE = 100 * 1024 * 1024
const MAX_FILES = 5
const API = '/api/file'

export default function UploadPage() {
    const [files, setFiles] = useState([])
    const [dragging, setDragging] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const inputRef = useRef(null)

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const formatExpiry = (isoString) => new Date(isoString).toLocaleTimeString('pl-PL', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    })

    const addFiles = (newFiles) => {
        setError(null)
        setResult(null)
        const valid = []
        for (const f of newFiles) {
            if (f.size > MAX_SIZE) { setError(`Plik "${f.name}" przekracza limit 100MB.`); continue }
            valid.push(f)
        }
        setFiles(prev => {
            const combined = [...prev, ...valid]
            if (combined.length > MAX_FILES) {
                setError(`Możesz przesłać maksymalnie ${MAX_FILES} pliki na raz.`)
                return combined.slice(0, MAX_FILES)
            }
            return combined
        })
    }

    const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i))

    const onDrop = useCallback((e) => {
        e.preventDefault()
        setDragging(false)
        addFiles(Array.from(e.dataTransfer.files))
    }, [])

    const upload = async () => {
        if (files.length === 0) return
        setUploading(true)
        setProgress(0)
        setError(null)
        const formData = new FormData()
        files.forEach(f => formData.append('files', f))
        try {
            const res = await axios.post(`${API}/upload`, formData, {
                onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total)),
            })
            setResult(res.data)
            setFiles([])
        } catch (err) {
            setError(err.response?.data?.error ?? 'Błąd podczas wysyłania plików.')
        } finally {
            setUploading(false)
        }
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!result && (
                <Card
                    variant="outlined"
                    sx={{
                        border: '2px dashed',
                        borderColor: dragging ? 'primary.main' : 'divider',
                        bgcolor: dragging ? 'action.hover' : 'transparent',
                        cursor: files.length < MAX_FILES ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                    }}
                    onClick={() => files.length < MAX_FILES && inputRef.current.click()}
                    onDrop={onDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                >
                    <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => addFiles(Array.from(e.target.files))}
                        />
                        {files.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 2 }}>
                                <UploadFileOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                <Typography variant="body1" fontWeight={500}>Przeciągnij pliki tutaj</Typography>
                                <Typography variant="body2" color="text.secondary">lub kliknij żeby wybrać</Typography>
                                <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                                    Maks. {MAX_FILES} pliki · 100MB każdy
                                </Typography>
                            </Box>
                        ) : (
                            <Box>
                                <List disablePadding>
                                    {files.map((f, i) => (
                                        <Box key={i}>
                                            <ListItem disablePadding sx={{ py: 0.5 }}>
                                                <InsertDriveFileOutlinedIcon sx={{ fontSize: 20, color: 'primary.main', mr: 1.5, flexShrink: 0 }} />
                                                <ListItemText
                                                    primary={f.name}
                                                    secondary={formatSize(f.size)}
                                                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500, noWrap: true }}
                                                    secondaryTypographyProps={{ variant: 'caption' }}
                                                />
                                                <ListItemSecondaryAction>
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeFile(i) }}>
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                            {i < files.length - 1 && <Divider />}
                                        </Box>
                                    ))}
                                </List>
                                {files.length < MAX_FILES && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                                        Kliknij żeby dodać więcej ({files.length}/{MAX_FILES})
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            {uploading && (
                <Box>
                    <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 99, height: 6 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>{progress}%</Typography>
                </Box>
            )}

            {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}

            {result && (
                <Card sx={{ border: '1px solid', borderColor: 'success.light' }}>
                    <CardContent sx={{ textAlign: 'center', p: 4, '&:last-child': { pb: 4 } }}>
                        <Typography variant="body2" color="success.main" fontWeight={600} sx={{ mb: 2 }}>
                            {result.fileCount === 1 ? 'Plik wysłany pomyślnie' : `${result.fileCount} pliki wysłane pomyślnie`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                            Kod odbioru
                        </Typography>
                        <Typography variant="h2" fontWeight={700} letterSpacing={6} fontFamily="monospace" sx={{ my: 1 }}>
                            {result.code}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                            {result.files.map((f, i) => (
                                <Chip key={i} label={`${f.originalName} (${formatSize(f.fileSize)})`} size="small" variant="outlined" />
                            ))}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                            Wygasa o {formatExpiry(result.expiresAt)}
                        </Typography>
                        <Box sx={{ mt: 3 }}>
                            <Button variant="outlined" onClick={() => setResult(null)}>Wyślij kolejne pliki</Button>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {!result && (
                <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={files.length === 0 || uploading}
                    onClick={upload}
                    sx={{ py: 1.5 }}
                >
                    {uploading ? 'Wysyłanie...' : `Wyślij ${files.length > 0 ? `(${files.length})` : ''}`}
                </Button>
            )}
        </Box>
    )
}