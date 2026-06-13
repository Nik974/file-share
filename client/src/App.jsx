import { useState } from 'react'
import { Box, Tabs, Tab, Container, IconButton, Tooltip } from '@mui/material'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import UploadPage from './pages/UploadPage'
import ReceivePage from './pages/ReceivePage'

export default function App({ mode, setMode }) {
    const [tab, setTab] = useState(0)

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Box sx={{
                position: 'sticky', top: 0, zIndex: 10,
                bgcolor: 'background.default',
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}>
                <Container maxWidth="sm">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tabs
                            value={tab}
                            onChange={(_, v) => setTab(v)}
                            sx={{ flex: 1, '& .MuiTab-root': { textTransform: 'none', fontSize: 15 } }}
                        >
                            <Tab icon={<UploadFileOutlinedIcon fontSize="small" />} iconPosition="start" label="Wyślij plik" />
                            <Tab icon={<DownloadOutlinedIcon fontSize="small" />} iconPosition="start" label="Odbierz plik" />
                        </Tabs>
                        <Tooltip title={mode === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}>
                            <IconButton onClick={() => setMode(m => m === 'dark' ? 'light' : 'dark')} size="small">
                                {mode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Container>
            </Box>
            <Container maxWidth="sm" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
                {tab === 0 ? <UploadPage /> : <ReceivePage />}
            </Container>
        </Box>
    )
}