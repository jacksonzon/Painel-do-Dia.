// services/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://xslwfbwurkkhnegxmzja.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MoSJo7pIvWkiR3CXgXQU7w_WjY7G...'; // Substitua com a sua Publishable Key completa se necessário

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);