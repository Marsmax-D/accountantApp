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

INSERT OR IGNORE INTO categories (id, name, type, source, icon, color, sort_order, is_system) VALUES
(1,  '工资',         'income', 'manual', 'briefcase',          '#4CAF50', 1, 1),
(2,  '奖金',         'income', 'manual', 'gift',               '#FF9800', 2, 1),
(3,  '微信转账',     'income', 'wechat', 'arrow.left.arrow.right', '#07C160', 3, 1),
(4,  '微信红包',     'income', 'wechat', 'gift',               '#FF5252', 4, 1),
(5,  '微信商户收款', 'income', 'wechat', 'building.store',     '#2196F3', 5, 1),
(6,  '现金收入',     'income', 'manual', 'dollarsign.circle',  '#9C27B0', 6, 1),
(7,  '投资收入',     'income', 'manual', 'chart.line.uptrend.xyaxis', '#00BCD4', 7, 1),
(8,  '其他收入',     'income', 'both',   'ellipsis.circle',    '#607D8B', 8, 1);
`;

export const REPORT_QUERIES = {
  incomeByCategory: `
    SELECT c.name, c.color, c.icon, SUM(t.amount) as total, COUNT(*) as count
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'income' AND t.date >= ? AND t.date <= ?
    GROUP BY t.category_id
    ORDER BY total DESC
  `,

  dailyIncome: `
    SELECT date, SUM(amount) as total
    FROM transactions
    WHERE type = 'income' AND date >= ? AND date <= ?
    GROUP BY date
    ORDER BY date ASC
  `,

  monthlyIncome: `
    SELECT substr(date, 1, 7) as month, SUM(amount) as total
    FROM transactions
    WHERE type = 'income' AND date >= ? AND date <= ?
    GROUP BY month
    ORDER BY month ASC
  `,

  incomeBySource: `
    SELECT source, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE type = 'income' AND date >= ? AND date <= ?
    GROUP BY source
  `,

  totalIncome: `
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM transactions
    WHERE type = 'income' AND date >= ? AND date <= ?
  `,

  recentTransactions: `
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    ORDER BY t.date DESC, t.id DESC
    LIMIT ?
  `,

  transactionsByDateRange: `
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.date >= ? AND t.date <= ?
    ORDER BY t.date DESC, t.id DESC
  `,

  searchTransactions: `
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.type = 'income'
      AND t.date >= ? AND t.date <= ?
      AND (t.note LIKE ? OR c.name LIKE ?)
    ORDER BY t.date DESC, t.id DESC
  `,
};
