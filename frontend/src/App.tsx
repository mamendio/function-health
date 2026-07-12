import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import { useAuth } from './auth'
import LoginForm from './components/LoginForm'
import TaskList from './components/TaskList'

export default function App() {
  const { isAuthenticated, logout } = useAuth()

  if (!isAuthenticated) return <LoginForm />

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Task Manager
          </Typography>
          <Button color="inherit" onClick={logout}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <TaskList />
      </Container>
    </Box>
  )
}
