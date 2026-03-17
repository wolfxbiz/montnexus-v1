import axios from 'axios'
import { supabase } from './supabaseClient'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

function setToken(session) {
  if (session?.access_token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`
  } else {
    delete apiClient.defaults.headers.common['Authorization']
  }
}

// Set token immediately from existing session
supabase.auth.getSession().then(({ data: { session } }) => setToken(session))

// Keep updated on login / logout / token refresh
supabase.auth.onAuthStateChange((_event, session) => setToken(session))

export default apiClient
