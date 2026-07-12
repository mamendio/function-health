import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import dayjs from 'dayjs'
import {
  apiErrorMessage,
  createTask,
  deleteTask,
  getTasks,
  updateTask,
  type Priority,
  type Task,
  type TaskInput,
} from '../api'
import TaskFormDialog from './TaskFormDialog'

type Toast = { message: string; severity: 'success' | 'error' }

const PRIORITY_COLOR: Record<Priority, 'success' | 'warning' | 'error'> = {
  Low: 'success',
  Medium: 'warning',
  High: 'error',
}

// The main task board. Loads the active tasks and wires up create / edit / delete /
// complete. After every change it calls load() to re-fetch from the server, so the list
// always matches the backend (which decides ordering and which tasks count as "active").
export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)      // true while the initial fetch runs
  const [loadError, setLoadError] = useState<string | null>(null) // shown if the fetch fails
  const [toast, setToast] = useState<Toast | null>(null)          // brief success/error banner
  const [formOpen, setFormOpen] = useState(false)   // is the create/edit dialog open?
  const [editing, setEditing] = useState<Task | null>(null)       // task being edited (null = creating)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null) // task awaiting delete confirm

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setTasks(await getTasks())
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Could not load tasks.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (task: Task) => {
    setEditing(task)
    setFormOpen(true)
  }

  // Thrown errors propagate to the dialog so it can show them and keep input.
  const submitForm = async (input: TaskInput) => {
    if (editing) {
      await updateTask(editing.id, input)
      setToast({ message: 'Task updated.', severity: 'success' })
    } else {
      await createTask(input)
      setToast({ message: 'Task created.', severity: 'success' })
    }
    await load()
  }

  const toggleComplete = async (task: Task) => {
    try {
      await updateTask(task.id, {
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        isComplete: !task.isComplete,
      })
      await load() // completed tasks drop off the active list
    } catch (err) {
      setToast({ message: apiErrorMessage(err, 'Could not update task.'), severity: 'error' })
    }
  }

  const confirmDelete = async () => {
    const target = deleteTarget
    setDeleteTarget(null)
    if (!target) return
    try {
      await deleteTask(target.id)
      await load()
      setToast({ message: 'Task deleted.', severity: 'success' })
    } catch (err) {
      setToast({ message: apiErrorMessage(err, 'Could not delete task.'), severity: 'error' })
    }
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Your tasks</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New task
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : loadError ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={load}>
              Retry
            </Button>
          }
        >
          {loadError}
        </Alert>
      ) : tasks.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          No tasks yet. Create your first one.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {tasks.map((task) => (
            <Card key={task.id} variant="outlined">
              <CardContent
                sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, '&:last-child': { pb: 2 } }}
              >
                <Checkbox
                  checked={task.isComplete}
                  onChange={() => toggleComplete(task)}
                  slotProps={{ input: { 'aria-label': `Mark "${task.title}" complete` } }}
                  sx={{ mt: -0.5 }}
                />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="subtitle1">{task.title}</Typography>
                    <Chip
                      label={task.priority}
                      color={PRIORITY_COLOR[task.priority]}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                  {task.description && (
                    <Typography variant="body2" color="text.secondary">
                      {task.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {task.dueDate
                      ? `Due ${dayjs(task.dueDate).format('MMM D, YYYY · h:mm A')}`
                      : 'No due date'}
                  </Typography>
                </Box>
                <IconButton aria-label="Edit task" onClick={() => openEdit(task)}>
                  <EditIcon />
                </IconButton>
                <IconButton aria-label="Delete task" onClick={() => setDeleteTarget(task)}>
                  <DeleteIcon />
                </IconButton>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <TaskFormDialog
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={submitForm}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete task?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            “{deleteTarget?.title}” will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  )
}
