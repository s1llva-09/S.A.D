const SUPABASE_URL = "https://dethfzlkhfvekpbzgsdk.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRldGhmemxraGZ2ZWtwYnpnc2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTQwMDIsImV4cCI6MjA5MTc3MDAwMn0.j-3D73zvyq4-jfxh9F3bLnnL-mcTjm6YBZsoHfa6NsM"

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

window.supabaseClient = supabaseClient

