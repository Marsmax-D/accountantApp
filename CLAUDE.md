# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

"管账人" — 个人收入记账应用，基于 Expo SDK 56 + React Native 0.85，支持 iOS、Android 和 Web。

## 常用命令

```bash
npm start              # 启动 Expo 开发服务器
npm run web            # 启动 Web 模式
npm run android        # 在 Android 模拟器中运行
npm run ios            # 在 iOS 模拟器中运行
npx expo lint          # ESLint 检查
npm run reset-project  # 重置项目（清除示例代码）
```

## 技术栈

- **框架**: Expo SDK 56, React Native 0.85, Expo Router (基于文件的路由)
- **语言**: TypeScript 6.0, strict 模式
- **数据库**: expo-sqlite (本地 SQLite, WAL 模式)
- **状态管理**: Zustand
- **图表**: Victory Native
- **动画**: react-native-reanimated
- **日期**: date-fns
- **CSV/XLSX 解析**: papaparse, xlsx

## 路径别名

`tsconfig.json` 中配置了两个路径别名：
- `@/*` → `./src/*`
- `@/assets/*` → `./assets/*`

## 架构

### 路由 (src/app/)

使用 Expo Router 文件路由系统。根布局 `_layout.tsx` 包裹 SQLiteProvider + Stack 导航器。

- **Tab 页面** (`(tabs)/`): 4 个标签页 — 首页 (`index`)、账单 (`transactions`)、报表 (`reports`)、设置 (`settings`)
- **模态页面**: `add-transaction` (新增/编辑收入)、`csv-import` (微信账单导入)、`report-detail` (对比分析)、`category-manage` (分类管理)
- 模态页面以 `presentation: 'modal'` + `slide_from_bottom` 动画呈现
- `app.config.ts` 中启用了 `typedRoutes: true`，生成静态路由类型

### 数据库层 (src/db/)

工厂函数模式 — 通过 `useSQLiteContext()` 获取数据库实例，传递给工厂函数创建仓库对象：

```
db = useSQLiteContext()
txRepo = createTransactionRepo(db)
catRepo = createCategoryRepo(db)
reportQueries = createReportQueries(db)
```

- `schema.ts` — 建表 SQL（categories + transactions）、预置系统分类数据、报表查询语句
- `database.ts` — `initializeDatabase()` 在 SQLiteProvider 的 `onInit` 回调中调用，处理建表和数据迁移
- `transaction-repo.ts` — 交易记录的增删改查，支持筛选、搜索、分页
- `category-repo.ts` — 分类的增删改查，系统分类不可删除
- `report-queries.ts` — 报表聚合查询（按分类/日期/来源/渠道汇总收入）

**数据库设计要点**:
- 目前只处理收入（`type = 'income'`），支出类型的数据结构已预留但功能未实现
- transactions 表有 `order_id` 唯一索引，用于微信导入去重
- categories 表有 `is_system` 字段标记系统预置分类，系统分类不可删除
- categories 有 `channel` 字段区分线上线下，`source` 字段区分微信/手动/通用

### 状态管理 (src/store/)

- `use-ui-store.ts` — Zustand store，管理报表类型、筛选条件、搜索词等全局 UI 状态

### 类型定义 (src/types/)

- `transaction.ts` — Transaction, Category, TransactionWithCategory 等核心类型
- `csv.ts` — 微信账单解析相关类型 (WeChatTransaction, CsvParseResult, DedupResult)
- `report.ts` — 报表类型 (ReportSummary, CategoryBreakdown, ComparisonData 等)

### 微信账单导入流程

1. 用户通过 DocumentPicker 选择 CSV 或 XLSX 文件
2. 解析器自动检测编码（UTF-8 / GBK），用 papaparse 或 xlsx 库解析
3. 只导入"收入"类型的记录
4. 根据 order_id 去重（已有记录跳过）
5. 按交易类型自动归类（红包→id=4, 转账→id=3, 商户收款→id=5, 其他→id=8）
6. 逐条插入数据库（order_id 重复时静默跳过）

### 主题系统

支持亮色/暗色模式，通过 `useColorScheme()` 自动检测系统偏好。`src/constants/theme.ts` 定义了颜色、字体（平台适配）、间距常量。`ThemedText` 和 `ThemedView` 组件处理主题切换。

## Expo 版本说明

始终参考 v56.0.0 版本文档：https://docs.expo.dev/versions/v56.0.0/

启用的实验性功能：`typedRoutes`、`reactCompiler`（React Compiler）。
