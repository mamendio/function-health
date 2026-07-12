import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { theme } from './theme'
import { AuthProvider } from './auth'
import App from './App.tsx'
import './index.css'

// App entry point. Each provider wraps the whole app (outermost first):
//   ThemeProvider + CssBaseline -> MUI theme and a consistent CSS baseline
//   LocalizationProvider        -> gives the date-time picker its dayjs date engine
//   AuthProvider                -> makes login state available everywhere via useAuth()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  </StrictMode>,
)
