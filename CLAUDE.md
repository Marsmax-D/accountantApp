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
npm run reset-project  # 重置项目（清除示例代码和初始数据，恢复到干净状态）
```

## 编写代码前必读

始终参考 **v56.0.0** 版本文档：https://docs.expo.dev/versions/v56.0.0/

## 技术栈

- **框架**: Expo SDK 56, React Native 0.85, Expo Router (基于文件的路由)
- **语言**: TypeScript 6.0, strict 模式
- **数据库**: expo-sqlite (本地 SQLite, WAL 模式)
- **状态管理**: Zustand
- **图表**: Victory Native
- **动画**: react-native-reanimated + react-native-worklets
- **日期**: date-fns
- **CSV/XLSX 解析**: papaparse, xlsx
- **云端同步**: @supabase/supabase-js（PostgreSQL + Realtime 订阅）

## 路径别名

`tsconfig.json` 中配置了两个路径别名：
- `@/*` → `./src/*`
- `@/assets/*` → `./assets/*`

## 平台特定文件约定

Expo 标准的平台文件扩展名约定：`.web.tsx` / `.web.ts` 文件仅在 Web 平台加载，同名的 `.tsx` / `.ts` 文件在原生平台加载。例如：
- `use-color-scheme.ts` (原生直接使用 RN 的 `useColorScheme`) / `use-color-scheme.web.ts` (Web 使用 expo 的 polyfill)
- `(tabs)/_layout.tsx` (原生 Tab 栏) / `(tabs)/_layout.web.tsx` (Web Tab 栏)
- `animated-icon.tsx` (原生 Keyframe 动画) / `animated-icon.web.tsx` (Web CSS 动画)

## 架构

### 路由 (src/app/)

使用 Expo Router 文件路由系统。根布局 `_layout.tsx` 包裹 SQLiteProvider + Stack 导航器。

- **Tab 页面** (`(tabs)/`): 5 个标签页 — 首页 (`index`)、账单 (`transactions`)、报表 (`reports`)、家庭 (`family`)、设置 (`settings`)
- **模态页面**: `add-transaction` (新增/编辑收入)、`csv-import` (微信账单导入)、`report-detail` (对比分析)、`category-manage` (分类管理)
- 模态页面以 `presentation: 'modal'` + `slide_from_bottom` 动画呈现
- `app.json` 中启用了 `typedRoutes: true`，生成静态路由类型

**双重 Tab 实现**: 原生和 Web 使用完全不同的 Tab 组件：
- 原生 (`(tabs)/_layout.tsx`): 使用 `expo-router/js-tabs` 的 `Tabs`，自定义 `TabIcon` 组件支持选中时弹跳+缩放的 Reanimated 弹簧动画，通过 `Pressable` 禁用 android ripple
- Web (`(tabs)/_layout.web.tsx`): 使用 `expo-router/ui` 的 `Tabs`/`TabList`/`TabTrigger`/`TabSlot`，底部固定悬浮胶囊式 Tab 栏，纯 CSS 样式

### 数据库层 (src/db/)

工厂函数模式 — 通过 `useSQLiteContext()` 获取数据库实例，传递给工厂函数创建仓库对象：

```
db = useSQLiteContext()
txRepo = createTransactionRepo(db)
catRepo = createCategoryRepo(db)
reportQueries = createReportQueries(db)
```

- `schema.ts` — 建表 SQL（categories + transactions）、预置系统分类数据（INSERT OR IGNORE）、报表查询语句
- `database.ts` — `initializeDatabase()` 负责建表和数据迁移
- `transaction-repo.ts` — 交易记录的增删改查，支持筛选、搜索、分页
- `category-repo.ts` — 分类的增删改查，系统分类（`is_system=1`）不可删除
- `report-queries.ts` — 报表聚合查询（按分类/日期/来源/渠道汇总收入）

**数据库初始化流程**: `_layout.tsx` 中渲染两次 `SQLiteProvider`：
1. 当 `dbReady=false` 时，传入 `onInit={initializeDatabase}` 执行建表，`AnimatedSplashOverlay` 显示开屏动画
2. 建表完成后设置 `dbReady=true`，重新渲染不带 `onInit` 的 Provider
这样确保数据库初始化在开屏动画期间完成，且不会重复执行

**数据库迁移策略**: 在 `initializeDatabase()` 末尾按顺序调用 `migrateV1()`、`migrateV2()` 等函数。每个迁移函数用 try/catch 包裹使其幂等（列已存在时静默跳过）。

- `migrateV1` — 为 categories 表添加 `channel` 列，设置现金收入为 offline
- `migrateV2` — 为 transactions/categories 添加 `remote_id`、`sync_status`、`deleted_at` 等家庭同步字段；创建 `sync_meta`（键值存储）和 `sync_operations`（操作队列）表

**数据库设计要点**:
- 目前只处理收入（`type = 'income'`），支出类型的数据结构已预留但功能未实现
- transactions 表有 `order_id` 唯一索引（带 WHERE 子句的部分索引），用于微信导入去重
- categories 表有 `is_system` 字段标记系统预置分类（1-8），系统分类不可删除
- categories 有 `channel` 字段区分线上线下（online/offline），`source` 字段区分微信/手动/通用（wechat/manual/both）

### 状态管理 (src/store/)

- `use-ui-store.ts` — Zustand store，管理报表类型（monthly/quarterly/yearly）、当前选中日期、筛选条件（日期范围、分类、来源）、搜索词、以及各字段的 setter 和 `resetFilters`
- `use-family-store.ts` — Zustand store，管理家庭同步状态：userId、nickname、familyId、inviteCode、role（owner/admin/member）、成员列表、最后同步时间、待同步计数

### 类型定义 (src/types/)

- `transaction.ts` — Transaction, InsertTransaction, Category, TransactionWithCategory
- `csv.ts` — WeChatTransaction, CsvParseResult, DedupResult
- `report.ts` — ReportSummary, CategoryBreakdown, DailyTotal, MonthlyTotal, SourceBreakdown, ChannelBreakdown, ComparisonData, ReportType

### 组件目录 (src/components/)

- `common/` — FloatingActionButton, EmptyState, CategoryPicker, ConfirmDialog
- `dashboard/` — IncomeTotalCard, RecentTransactions, SourceBreakdown, IncomeByChannel, DashboardEmptyState
- `reports/` — PeriodSelector, IncomeBarChart, CategoryBreakdown, SourcePieChart, ComparisonView, ReportSummaryCard
- `family/` — CreateFamilyForm（创建家庭表单）、JoinFamilyForm（加入家庭表单）、FamilyDetails（家庭详情 + 成员列表 + 同步按钮）
- `transactions/` — FilterBar
- `ui/` — collapsible (基于 @radix-ui)
- 根级通用组件 — themed-text, themed-view, external-link, web-badge, hint-row, animated-icon

### 主题系统

支持亮色/暗色模式，通过 `useColorScheme()` 自动检测系统偏好。`app.json` 中配置 `userInterfaceStyle: "automatic"`。
`src/constants/theme.ts` 定义了 Colors（亮/暗两组）、Fonts（按平台区分：iOS 使用系统字体族、Web 使用 CSS 变量、Android 使用通用字体族）、Spacing（6 级间距）、BottomTabInset（iOS 50/Android 80）、MaxContentWidth（800）。
`global.css` 定义 Web 端 CSS 字体变量（--font-display, --font-mono, --font-rounded, --font-serif）。
`ThemedText` 和 `ThemedView` 组件处理主题切换，通过 `type` prop 选择背景/文字颜色层级。

### 开屏动画

`AnimatedSplashOverlay` 组件在 `_layout.tsx` 中渲染，使用 reanimated 的 `Keyframe` 实现缩放+淡出动画（600ms），动画结束后通过 `react-native-worklets` 的 `scheduleOnRN` 切换到 JS 线程设置 `visible=false` 卸载自己。

### 微信账单导入流程

1. 用户通过 DocumentPicker 选择 CSV 或 XLSX 文件
2. 解析器自动检测编码（UTF-8 / GBK），用 papaparse（CSV）或 xlsx（XLSX）库解析
3. 只导入"收入"类型的记录
4. 根据 `order_id` 去重（`dedup.ts` 中先查询已有 order_id 集合，跳过重复记录）
5. 按交易类型自动归类（`categorizeWeChatTransaction`: 红包→id=4, 转账→id=3, 商户收款→id=5, 其他→id=8）
6. 逐条插入数据库（order_id 重复时 SQLite 抛异常被静默捕获跳过）

### 工具函数 (src/utils/)

- `date-utils.ts` — 日期范围计算
- `format.ts` — 货币/日期/百分比格式化
- `uuid.ts` — `generateUUID()`（UUID v4，跨平台兼容，无需原生依赖）和 `generateInviteCode()`（6 位随机数字邀请码）
- `dedup.ts` — 微信账单去重 + 自动归类
- `wechat-csv-parser.ts` — CSV 解析器（自动编码检测 UTF-8/GBK）
- `wechat-xlsx-parser.ts` — XLSX 解析器

### 编辑器配置

- `.vscode/settings.json`: 保存时自动 fix、organize imports、sort members
- `.vscode/extensions.json`: 推荐 expo.vscode-expo-tools 扩展

### 云端同步（家庭共享）

通过 Supabase 实现多设备家庭成员间的数据同步，涉及 5 个文件：

- `src/supabase/client.ts` — Supabase 客户端初始化
- `src/sync/sync-engine.ts` — 核心同步引擎：`pushChanges`（本地→云端，通过 sync_operations 队列逐条推送），`pullChanges`（云端→本地，基于 sync_journal 游标增量拉取），`fullSync`（首次加入家庭时全量同步），以及家庭 CRUD（`createFamily`/`joinFamily`/`leaveFamily`/`getFamilyMembers`/`removeMember`）
- `src/sync/realtime.ts` — Supabase Realtime 订阅 sync_journal INSERT 事件，收到通知后自动触发 `pullChanges`
- `supabase-setup.sql` — Supabase 云端数据库建表脚本：families、family_members、remote_categories、remote_transactions、sync_journal（含自动记录变更的触发器）。RLS 已禁用（应用层控制权限）。

**同步架构**:
1. 本地修改先写入 `sync_operations` 队列，标记 `sync_status='pending'`
2. `pushChanges` 依次消费队列中的操作，调用 Supabase REST API 写入云端
3. 云端 PostgreSQL 触发器自动写入 `sync_journal` 表
4. 其他设备通过 Realtime 订阅收到通知，自动触发 `pullChanges`
5. 拉取时根据 `sync_journal.id` 游标增量获取变更记录

**数据库侧**:
- `migrateV2` 为本地表添加 `remote_id`（云端 UUID 映射）、`sync_status`（synced/pending/conflict）、`deleted_at`（软删除）
- `sync_meta` 表存储键值对（user_id, family_id, invite_code, role, last_pull_cursor）
- 使用软删除而非物理删除，确保删除操作也能同步

## 配置

`app.json` 关键配置：`scheme: "accounterapp"`, `userInterfaceStyle: "automatic"`, `web.output: "static"`, `android.predictiveBackGestureEnabled: false`。启用的实验性功能：`typedRoutes`（静态路由类型）和 `reactCompiler`（React Compiler）。使用的插件: expo-router, expo-splash-screen, expo-sqlite, expo-sharing, @react-native-community/datetimepicker。
