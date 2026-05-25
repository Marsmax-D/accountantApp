export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL CHECK(type IN ('income', 'expense')),
  source      TEXT    NOT NULL CHECK(source IN ('wechat', 'manual', 'both')),
  icon        TEXT,
  color       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_system   INTEGER NOT NULL DEFAULT 0,
  channel     TEXT    NOT NULL DEFAULT 'online' CHECK(channel IN ('online', 'offline')),
  remote_id   TEXT,
  sync_status TEXT    NOT NULL DEFAULT 'synced' CHECK(sync_status IN ('synced','pending','conflict')),
  deleted_at  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  amount      REAL    NOT NULL CHECK(amount > 0),
  type        TEXT    NOT NULL CHECK(type IN ('income', 'expense')),
  category_id INTEGER NOT NULL,
  source      TEXT    NOT NULL CHECK(source IN ('wechat', 'manual')),
  date        TEXT    NOT NULL,
  note        TEXT,
  order_id    TEXT,
  wechat_raw  TEXT,
  remote_id   TEXT,
  sync_status TEXT    NOT NULL DEFAULT 'synced' CHECK(sync_status IN ('synced','pending','conflict')),
  created_by  TEXT,
  deleted_at  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_transactions_date      ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category  ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type      ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_source    ON transactions(source);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_order_id
  ON transactions(order_id) WHERE order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sync_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_operations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT    NOT NULL CHECK(table_name IN ('categories','transactions')),
  local_id   INTEGER NOT NULL,
  remote_id  TEXT,
  operation  TEXT    NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE')),
  payload    TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);

INSERT OR IGNORE INTO categories (id, name, type, source, icon, color, sort_order, is_system, channel) VALUES
(1,  '工资',         'income', 'manual', 'briefcase',              '#4CAF50', 1, 1, 'online'),
(2,  '奖金',         'income', 'manual', 'gift',                   '#4CAF50', 2, 1, 'online'),
(3,  '微信转账',     'income', 'wechat', 'arrow.left.arrow.right', '#4CAF50', 3, 1, 'online'),
(4,  '微信红包',     'income', 'wechat', 'gift',                   '#4CAF50', 4, 1, 'online'),
(5,  '微信商户收款', 'income', 'wechat', 'building.store',         '#4CAF50', 5, 1, 'online'),
(6,  '现金收入',     'income', 'manual', 'dollarsign.circle',      '#4CAF50', 6, 1, 'offline'),
(7,  '投资收入',     'income', 'manual', 'chart.line.uptrend.xyaxis', '#4CAF50', 7, 1, 'online'),
(8,  '其他收入',     'income', 'both',   'ellipsis.circle',        '#4CAF50', 8, 1, 'online'),
(9,  '餐饮',         'expense', 'manual', 'fork.knife',             '#F44336', 1, 1, 'online'),
(10, '交通',         'expense', 'manual', 'bus',                    '#F44336', 2, 1, 'online'),
(11, '购物',         'expense', 'manual', 'cart',                   '#F44336', 3, 1, 'online'),
(12, '住房',         'expense', 'manual', 'house',                  '#F44336', 4, 1, 'online'),
(13, '娱乐',         'expense', 'manual', 'gamecontroller',         '#F44336', 5, 1, 'online'),
(14, '医疗',         'expense', 'manual', 'cross.case',             '#F44336', 6, 1, 'online'),
(15, '教育',         'expense', 'manual', 'book',                   '#F44336', 7, 1, 'online'),
(16, '其他支出',     'expense', 'both',   'ellipsis.circle',        '#F44336', 8, 1, 'online');
`;

export const REPORT_QUERIES = {
  incomeByCategory: `
    SELECT c.name, c.color, c.icon, SUM(t.amount) as total, COUNT(*) as count
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'income' AND t.date >= ? AND t.date <= ? AND t.deleted_at IS NULL
    GROUP BY t.category_id
    ORDER BY total DESC
  `,

  dailyIncome: `
    SELECT date, SUM(amount) as total
    FROM transactions
    WHERE type = 'income' AND date >= ? AND date <= ? AND deleted_at IS NULL
    GROUP BY date
    ORDER BY date ASC
  `,

  monthlyIncome: `
    SELECT substr(date, 1, 7) as month, SUM(amount) as total
    FROM transactions
    WHERE type = 'income' AND date >= ? AND date <= ? AND deleted_at IS NULL
    GROUP BY month
    ORDER BY month ASC
  `,

  incomeByChannel: `
    SELECT c.channel, SUM(t.amount) as total, COUNT(*) as count
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'income' AND t.date >= ? AND t.date <= ? AND t.deleted_at IS NULL
    GROUP BY c.channel
  `,

  incomeBySource: `
    SELECT source, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE type = 'income' AND date >= ? AND date <= ? AND deleted_at IS NULL
    GROUP BY source
  `,

  totalIncome: `
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM transactions
    WHERE type = 'income' AND date >= ? AND date <= ? AND deleted_at IS NULL
  `,

  recentTransactions: `
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.deleted_at IS NULL
    ORDER BY t.date DESC, t.id DESC
    LIMIT ?
  `,

  transactionsByDateRange: `
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.date >= ? AND t.date <= ? AND t.deleted_at IS NULL
    ORDER BY t.date DESC, t.id DESC
  `,

  totalExpense: `
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM transactions
    WHERE type = 'expense' AND date >= ? AND date <= ? AND deleted_at IS NULL
  `,

  expenseByCategory: `
    SELECT c.name, c.color, c.icon, SUM(t.amount) as total, COUNT(*) as count
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'expense' AND t.date >= ? AND t.date <= ? AND t.deleted_at IS NULL
    GROUP BY t.category_id
    ORDER BY total DESC
  `,

  dailyExpense: `
    SELECT date, SUM(amount) as total
    FROM transactions
    WHERE type = 'expense' AND date >= ? AND date <= ? AND deleted_at IS NULL
    GROUP BY date
    ORDER BY date ASC
  `,

  monthlyExpense: `
    SELECT substr(date, 1, 7) as month, SUM(amount) as total
    FROM transactions
    WHERE type = 'expense' AND date >= ? AND date <= ? AND deleted_at IS NULL
    GROUP BY month
    ORDER BY month ASC
  `,

  searchTransactions: `
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.date >= ? AND t.date <= ?
      AND t.deleted_at IS NULL
      AND (t.note LIKE ? OR c.name LIKE ?)
    ORDER BY t.date DESC, t.id DESC
  `,
};
