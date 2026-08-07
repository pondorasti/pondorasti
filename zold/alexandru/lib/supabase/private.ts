import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing env vars SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
}

const privateClient = createClient(supabaseUrl, supabaseKey)

export default privateClient
