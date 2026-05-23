import { createClient } from '@supabase/supabase-js'

/**
 * Supabase browser client
 * ------------------------------------------------------------
 * This project intentionally does NOT fallback to mock data.
 * If the environment variables are missing, the app will show a clear error
 * so you know Supabase is not connected yet.
 *
 * Required variables in .env.local:
 * NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 * NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
 *
 * Supabase also has a newer public key name called PUBLISHABLE_KEY.
 * The code supports both names, but only one is required.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseKey)

export const supabase = hasSupabaseEnv
  ? createClient(supabaseUrl!, supabaseKey!)
  : null

export function assertSupabaseConnected() {
  if (!supabase) {
    throw new Error(
      'Supabase not connected: please create .env.local and set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }
  return supabase
}
