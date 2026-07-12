// Central API client for the backend.
// - Declares the Task / TaskInput types shared across the UI.
// - Creates a single axios instance whose interceptors automatically attach the JWT to
//   every request and trigger a logout when the server replies 401.
// - Exposes one function per endpoint (login, getTasks, createTask, ...).
import axios from 'axios'

// The backend URL comes from frontend/.env (VITE_API_URL); falls back to localhost for dev.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5080'
const TOKEN_KEY = 'tm_token'

export type Priority = 'Low' | 'Medium' | 'High'

export interface Task {
  id: number
  title: string
  description: string | null
  priority: Priority
  dueDate: string | null // ISO-8601 UTC, or null if no due date
  isComplete: boolean
}

export interface TaskInput {
  title: string
  description?: string | null
  priority: Priority
  dueDate?: string | null // ISO-8601 UTC, or null
  isComplete?: boolean
}

export const api = axios.create({ baseURL: API_URL })

// --- auth token wiring -------------------------------------------------------
// Initialised from storage so the very first request after a refresh is authed.
let authToken: string | null = localStorage.getItem(TOKEN_KEY)

export function setAuthToken(token: string | null) {
  authToken = token
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // A 401 on a normal call means the session is gone -> let the app log out.
    // (The login call handles its own 401 to show "invalid credentials".)
    if (
      axios.isAxiosError(err) &&
      err.response?.status === 401 &&
      !err.config?.url?.includes('/api/auth/login') &&
      onUnauthorized
    ) {
      onUnauthorized()
    }
    return Promise.reject(err)
  },
)

// --- calls -------------------------------------------------------------------
export async function login(username: string, password: string): Promise<string> {
  const { data } = await api.post<{ token: string }>('/api/auth/login', { username, password })
  return data.token
}

export async function getTasks(): Promise<Task[]> {
  const { data } = await api.get<Task[]>('/api/tasks')
  return data
}

export async function createTask(input: TaskInput): Promise<Task> {
  const { data } = await api.post<Task>('/api/tasks', input)
  return data
}

export async function updateTask(id: number, input: TaskInput): Promise<Task> {
  const { data } = await api.put<Task>(`/api/tasks/${id}`, input)
  return data
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/api/tasks/${id}`)
}

/** Extracts a user-facing message from an API error (validation, 409, 401, etc.). */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | string
      | undefined

    if (typeof data === 'string' && data) return data
    if (data && typeof data === 'object') {
      if (data.message) return data.message
      // ASP.NET validation ProblemDetails: { errors: { Field: ["msg"] } }
      if (data.errors) {
        const first = Object.values(data.errors)[0]
        if (Array.isArray(first) && first.length) return first[0]
      }
    }
    if (err.response?.status === 401) return 'Your session has expired. Please log in again.'
  }
  return fallback
}

export { TOKEN_KEY }
