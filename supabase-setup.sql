-- ============================================
-- 管账人 - 家庭共享账单 Supabase 建表脚本
-- 在 Supabase Dashboard → SQL Editor 中粘贴执行
-- ============================================

-- 1. 家庭（含邀请码）
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  owner_nickname TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 成员
CREATE TABLE family_members (
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  role TEXT CHECK(role IN ('owner','admin','member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (family_id, user_id)
);

-- 3. 云端分类
CREATE TABLE remote_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('income','expense')) DEFAULT 'income',
  source TEXT CHECK(source IN ('wechat','manual','both')) DEFAULT 'both',
  icon TEXT, color TEXT, sort_order INT DEFAULT 0,
  is_system INT DEFAULT 0,
  channel TEXT CHECK(channel IN ('online','offline')) DEFAULT 'online',
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 4. 云端交易
CREATE TABLE remote_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  amount REAL NOT NULL CHECK(amount > 0),
  type TEXT CHECK(type IN ('income','expense')) DEFAULT 'income',
  category_id UUID REFERENCES remote_categories(id),
  source TEXT CHECK(source IN ('wechat','manual')) DEFAULT 'manual',
  date TEXT NOT NULL,
  note TEXT, order_id TEXT,
  wechat_raw TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 5. 同步日志（增量拉取位点）
CREATE TABLE sync_journal (
  id BIGSERIAL PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT CHECK(operation IN ('INSERT','UPDATE','DELETE')) NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- 关闭 RLS（应用层控制权限，不需要数据库层 RLS）
ALTER TABLE families DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE remote_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE remote_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_journal DISABLE ROW LEVEL SECURITY;

-- 索引
CREATE INDEX idx_remote_tx_family ON remote_transactions(family_id, updated_at);
CREATE INDEX idx_remote_cat_family ON remote_categories(family_id, updated_at);
CREATE INDEX idx_sync_journal_family ON sync_journal(family_id, id);
CREATE UNIQUE INDEX idx_remote_tx_order_id ON remote_transactions(family_id, order_id) WHERE order_id IS NOT NULL;

-- 触发器：自动记录 sync_journal
CREATE OR REPLACE FUNCTION record_sync_journal()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO sync_journal (family_id, table_name, record_id, operation, changed_by)
    VALUES (NEW.family_id, TG_ARGV[0], NEW.id, 'INSERT', NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO sync_journal (family_id, table_name, record_id, operation, changed_by)
    VALUES (NEW.family_id, TG_ARGV[0], NEW.id, 'UPDATE', NEW.updated_by);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO sync_journal (family_id, table_name, record_id, operation, changed_by)
    VALUES (OLD.family_id, TG_ARGV[0], OLD.id, 'DELETE', NULL);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_categories AFTER INSERT OR UPDATE OR DELETE ON remote_categories
  FOR EACH ROW EXECUTE FUNCTION record_sync_journal('categories');

CREATE TRIGGER sync_transactions AFTER INSERT OR UPDATE OR DELETE ON remote_transactions
  FOR EACH ROW EXECUTE FUNCTION record_sync_journal('transactions');
