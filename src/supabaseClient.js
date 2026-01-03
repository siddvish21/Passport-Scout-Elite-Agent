import { createClient } from '@supabase/supabase-js'

export const createSupabaseClient = (url, key) => {
    const supabaseUrl = url || import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = key || import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        return null
    }

    return createClient(supabaseUrl, supabaseAnonKey)
}

// Default export for backward compatibility
const defaultUrl = import.meta.env.VITE_SUPABASE_URL
const defaultKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = (defaultUrl && defaultKey) ? createClient(defaultUrl, defaultKey) : null
