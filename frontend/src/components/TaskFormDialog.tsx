import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import dayjs, { type Dayjs } from 'dayjs'
import { apiErrorMessage, type Priority, type Task, type TaskInput } from '../api'

interface Props {
  open: boolean
  initial?: Task | null // null => create, task => edit
  onClose: () => void
  onSubmit: (input: TaskInput) => Promise<void>
}

const PRIORITIES: Priority[] = ['Low', 'Medium', 'High']

// One dialog used for both creating and editing a task (decided by the `initial` prop).
// The due date is optional: the "Set a due date" checkbox (hasDue) shows the picker, and the
// date is only validated and sent when that box is checked.
export default function TaskFormDialog({ open, initial, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('Medium')
  const [hasDue, setHasDue] = useState(false)
  const [due, setDue] = useState<Dayjs | null>(null)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [dueError, setDueError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Reset/populate whenever the dialog opens.
  useEffect(() => {
    if (!open) return
    setTitle(initial?.title ?? '')
    setDescription(initial?.description ?? '')
    setPriority(initial?.priority ?? 'Medium')
    setHasDue(!!initial?.dueDate)
    setDue(initial?.dueDate ? dayjs(initial.dueDate) : null)
    setTitleError(null)
    setDueError(null)
    setFormError(null)
  }, [open, initial])

  const handleSubmit = async () => {
    setTitleError(null)
    setDueError(null)
    setFormError(null)

    let valid = true
    if (!title.trim()) {
      setTitleError('Title is required.')
      valid = false
    }
    // Due date is optional, but if the checkbox is on it must be a valid date/time.
    if (hasDue && (!due || !due.isValid())) {
      setDueError('Enter a valid due date and time, or uncheck the box.')
      valid = false
    }
    if (!valid) return

    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueDate: hasDue && due ? due.toISOString() : null, // UTC or null
        isComplete: initial?.isComplete ?? false,
      })
      onClose()
    } catch (err) {
      // Server-side failure (e.g. validation): show it and keep the user's input.
      setFormError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit task' : 'New task'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={!!titleError}
            helperText={titleError}
            required
            autoFocus
          />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={2}
          />
          <TextField
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            select
          >
            {PRIORITIES.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Checkbox checked={hasDue} onChange={(e) => setHasDue(e.target.checked)} />
            }
            label="Set a due date"
          />
          {hasDue && (
            <DateTimePicker
              label="Complete by"
              value={due}
              onChange={(v) => setDue(v)}
              slotProps={{
                textField: { required: true, error: !!dueError, helperText: dueError },
              }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {initial ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
