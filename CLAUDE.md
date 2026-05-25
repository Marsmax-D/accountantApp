# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

"管账人" — 个人记账应用（支持收入与支出），基于 Expo SDK 56 + React Native 0.85，支持 iOS、Android 和 Web。

> 所有源代码和 package.json 均在 `accounterApp/` 目录下，运行命令前请先 `cd accounterApp`。

## 常用命令

```bash
npm start              # 启动 Expo 开发服务器
npm run web            # 启动 Web 模式
npm run android        # 在 Android 模拟器中运行
npm run ios            # 在 iOS 模拟器中运行
npx expo lint          # ESLint 检查
npx tsc --noEmit       # TypeScript 类型检查
npm run reset-project  # 重置项目
node ../serve-apk.js   # 启动 APK 分发服务器（根目录，用于局域网安装）
```

## 编写代码前必读

始终参考 **v56.0.0** 版本文档：https://docs.expo.dev/versions/v56.0.0/

## 技术栈

- **框架**: Expo SDK 56, React Native 0.85, Expo Router (文件路由), React 19
- **语言**: TypeScript 6.0 strict 模式
- **数据库**: expo-sqlite (SQLite WAL 模式)
- **状态管理**: Zustand
- **图表**: Victory Native
- **动画**: react-native-reanimated + react-native-worklets
- **日期**: date-fns
- **CSV/XLSX**: papaparse, xlsx
- **云端同步**: @supabase/supabase-js (PostgreSQL + Realtime)
- **实验性**: React Compiler (app.json `reactCompiler: true`), typedRoutes

## 路径别名 (tsconfig.json)

- `@/*` → `./src/*`
- `@/assets/*` → `./assets/*`

## 关键架构模式

### 数据库层 (src/db/)

工厂函数模式 — 从 `useSQLiteContext()` 获取 db 实例后传递给工厂函数：

```typescript
const db = useSQLiteContext();
const txRepo = createTransactionRepo(db);
const catRepo = createCategoryRepo(db);
const reportQueries = createReportQueries(db);
```

工厂函数可接受可选的 `SyncContext` 参数（有家庭同步时传入，无同步时为 undefined）：

```typescript
const syncCtx = await getSyncContext(db); // undefined | { familyId, userId }
const txRepo = createTransactionRepo(db, syncCtx);
```

`getSyncContext()` 从 `sync_meta` 表读取，无家庭时返回 `undefined`。

### 开屏动画 + 数据库初始化 (src/app/_layout.tsx)

使用**两阶段 SQLiteProvider 渲染**避免重复初始化：
1. `dbReady=false` → 渲染带 `onInit={initializeDatabase}` 的 SQLiteProvider + `AnimatedSplashOverlay`
2. 建表完成 → `setDbReady(true)` → 重新渲染不带 `onInit` 的 Provider

### 同步机制 (src/sync/)

- `SyncProvider` (根布局包裹) 在有 `familyId` 时每 20 秒自动 `pushChanges` + `pullChanges`
- 同步完成后调用 `incrementSyncVersion()` → `syncVersion++` → 各页面通过 `useFamilyStore(s => s.syncVersion)` 的 `useEffect` 自动刷新数据
- Supabase Realtime 订阅 `sync_journal` 的 INSERT 事件，收到变更自动拉取
- `pushChanges` 在主流程中**不阻塞 UI** — 使用 `.catch(() => {})` 的 fire-and-forget 模式
- 新增云端表时需同步更新 `supabase-setup.sql`（建表 + 触发器 + 索引）和 `sync-engine.ts`（推送/拉取逻辑）

### 页面数据加载模式

所有列表/统计页面使用 `useFocusEffect` 确保每次聚焦时刷新：

```typescript
useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
```

同步完成后通过 `syncVersion` 驱动自动刷新（仅首页 dashboard）：

```typescript
const syncVersion = useFamilyStore((s) => s.syncVersion);
useEffect(() => { loadData(); }, [syncVersion, loadData]);
```

### 路由结构 (src/app/)

- **Tab 页面** `(tabs)/`: index(首页), transactions(账单), reports(报表), family(家庭), settings(设置)
- **模态页面**: add-transaction, csv-import, report-detail, category-manage
  - 在 `_layout.tsx` 中以 `presentation: 'modal'` + `animation: 'slide_from_bottom'` 注册
- 新增标签页需同时创建 `(tabs)/xxx.tsx` 并分别在 `_layout.tsx` (原生 Tabs) 和 `_layout.web.tsx` (Web Tabs) 中注册
- 使用 `expo-router/js-tabs` (原生) 和 `expo-router/ui` (Web) 两套 Tab 实现
- 原生 Tab `TabBarButton` 使用 `android_ripple={null}` 禁用 Android 水波纹
- 原生 Tab 图标使用 `Animated.spring` 实现选中弹跳 + 缩放动画

### 数据库迁移

`initializeDatabase()` 末尾按顺序调用 `migrateV1()`、`migrateV2()` 等。每个迁移用 try/catch 包裹使其幂等（列已存在时静默跳过）。

### 平台文件约定

- `file.web.tsx` → 仅 Web 加载；同名的 `file.tsx` → 原生加载
- 例如: `use-color-scheme.ts` / `use-color-scheme.web.ts`, `_layout.tsx` / `_layout.web.tsx`

### 收入/支出切换模式

`SegmentedControl` (`src/components/common/SegmentedControl.tsx`) 是通用的分段选择器，用于 4 个场景：
- **添加页**: 切换收入/支出，动态加载对应分类
- **交易列表**: 全部/收入/支出 筛选，传递 `type` 参数给 `txRepo.getAll()`
- **报表页**: 切换收入报表/支出报表，条件调用 `reportQueries.totalIncome` 或 `totalExpense`
- **分类管理**: 切换收入分类/支出分类

添加新的交易类型相关页面时复用此组件。

### 主题 (src/constants/theme.ts)

`Colors` 含 `light` / `dark` 两组色值（text, background, backgroundElement, backgroundSelected, textSecondary）。
通过 `useColorScheme()` 自动检测。`app.json` 中 `userInterfaceStyle: "automatic"`。

## 项目结构

```
src/
  app/               # Expo Router 路由页面
    _layout.tsx       # 根布局：SQLiteProvider + Stack + SyncProvider
    (tabs)/           # 底部 Tab 页面
    add-transaction.tsx, csv-import.tsx, report-detail.tsx, category-manage.tsx  # 模态页面
  db/                 # 数据库层
    schema.ts         # 建表 SQL + 预置分类数据 + 报表查询 SQL
    database.ts       # initializeDatabase + migrations
    transaction-repo.ts, category-repo.ts, report-queries.ts  # 仓库/查询
  store/              # Zustand 状态管理
    use-ui-store.ts   # UI 状态（报表类型、筛选条件、搜索词）
    use-family-store.ts # 家庭同步状态（members, syncVersion 等）
  types/              # TypeScript 类型定义
    transaction.ts, csv.ts, report.ts
  components/         # UI 组件（按功能分目录）
    common/           # FloatingActionButton, EmptyState, CategoryPicker, ConfirmDialog
    dashboard/        # 首页组件
    reports/          # 报表组件（图表）
    transactions/     # FilterBar
    family/           # CreateFamilyForm, JoinFamilyForm, FamilyDetails
  sync/               # 云端同步
    SyncProvider.tsx, sync-engine.ts, realtime.ts
  supabase/client.ts  # Supabase 客户端
  utils/              # 工具函数
    date-utils.ts, format.ts, uuid.ts, dedup.ts
    wechat-csv-parser.ts, wechat-xlsx-parser.ts
```

## 数据库设计要点

- 支持收入 (`income`) 和支出 (`expense`) 两种类型，各 8 个系统预置分类（id 1-8 收入，id 9-16 支出，均为 `is_system=1` 不可删除）
- `transactions.order_id` 有唯一部分索引（`WHERE order_id IS NOT NULL`），用于微信导入去重
- `categories` 的 `is_system=1`（id 1-16）不可删除
- `channel` 字段区分线上线下（online/offline），`source` 区分微信/手动/通用（wechat/manual/both）
- 软删除 (`deleted_at`) 确保删除操作可通过同步传播
- `sync_meta` 键值表存储 `user_id`, `family_id`, `invite_code`, `role`, `last_pull_cursor`
- `sync_operations` 队列记录待推送的本地变更
