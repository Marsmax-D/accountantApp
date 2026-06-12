// Supabase 客户端配置
// 将下方的 SUPABASE_URL 和 SUPABASE_ANON_KEY 替换为你的实际值
// 在 Supabase Dashboard → Settings → API 中获取

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://twzzhxnqarxgazgklelo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0XqN2V9aTZkyUPUadOnhTg_XpndJqnG';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
