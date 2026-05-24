# 管账人

个人收入记账应用，支持手动记账和微信账单导入。基于 Expo SDK 56 + React Native 0.85，支持 Android、iOS 和 Web。

## 功能

- **收入记录** — 手动添加收入，支持金额、分类、日期、备注，可编辑和删除
- **微信账单导入** — 支持 CSV / XLSX 微信账单文件导入，自动检测编码（UTF-8/GBK），智能去重归类
- **分类管理** — 预置 8 个系统分类（工资、红包、转账、商户收款等），支持自定义分类，区分线上/线下渠道
- **数据报表** — 按月/季/年查看收入趋势柱状图，支持左右滑动切换周期，点击柱子查看明细
- **仪表盘** — 今日收入总览，较昨日对比，线上/线下渠道拆分，最近记录
- **对比分析** — 不同时期数据对比，展示环比变化率
- **暗色模式** — 跟随系统自动切换亮色/暗色主题

## 下载

最新版本：**[v1.0.2](https://github.com/Marsmax-D/accounterApp/releases/tag/v1.0.2)**

[![Release](https://img.shields.io/github/v/release/Marsmax-D/accounterApp?style=flat-square)](https://github.com/Marsmax-D/accounterApp/releases)

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Expo SDK 56, React Native 0.85 |
| 路由 | Expo Router（文件路由，typedRoutes 自动类型生成） |
| 语言 | TypeScript 6.0, strict 模式 |
| 数据库 | expo-sqlite（本地 SQLite, WAL 模式） |
| 状态管理 | Zustand |
| 图表 | Victory Native (react-native-svg) |
| 动画 | react-native-reanimated, react-native-worklets |
| 手势 | react-native-gesture-handler, PanResponder |
| 日期 | date-fns |
| 文件解析 | papaparse（CSV）, xlsx（XLSX） |
| 构建 | React Compiler（实验性） |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## 项目结构

```
src/
├── app/                     # Expo Router 页面
│   ├── _layout.tsx          # 根布局（GestureHandlerRootView + SQLiteProvider + Stack）
│   ├── (tabs)/
│   │   ├── _layout.tsx      # 原生 Tab 栏（含 Tab 图标弹跳动画）
│   │   ├── _layout.web.tsx  # Web Tab 栏（胶囊式悬浮）
│   │   ├── index.tsx        # 首页仪表盘
│   │   ├── transactions.tsx # 账单列表
│   │   ├── reports.tsx      # 数据报表（滑动切换 + 柱状图）
│   │   └── settings.tsx     # 设置
│   ├── add-transaction.tsx  # 新增/编辑收入（模态）
│   ├── csv-import.tsx       # 微信账单导入（模态）
│   ├── category-manage.tsx  # 分类管理（模态）
│   └── report-detail.tsx    # 对比分析（模态）
├── components/
│   ├── common/              # 通用组件（FAB、EmptyState、CategoryPicker、ConfirmDialog）
│   ├── dashboard/           # 仪表盘组件（收入卡片、渠道拆分、最近记录）
│   ├── reports/             # 报表组件（周期选择器、柱状图、分类明细、对比视图）
│   ├── transactions/        # 账单组件（筛选栏）
│   └── ui/                  # 基础 UI（collapsible）
├── db/                      # 数据库层
│   ├── schema.ts            # 建表 SQL + 系统分类预置 + 报表查询语句
│   ├── database.ts          # 数据库初始化 + 迁移
│   ├── transaction-repo.ts  # 交易 CRUD（筛选、搜索、分页）
│   ├── category-repo.ts     # 分类 CRUD
│   └── report-queries.ts    # 聚合查询
├── store/                   # Zustand 状态管理
│   └── use-ui-store.ts      # 报表类型、筛选条件、搜索词
├── types/                   # TypeScript 类型
│   ├── transaction.ts
│   ├── csv.ts
│   └── report.ts
├── utils/                   # 工具函数
│   ├── format.ts            # 货币/日期格式化（人民币、相对日期、百分比）
│   ├── date-utils.ts        # 日期范围计算（月/季/年）
│   ├── dedup.ts             # 微信账单去重 + 自动归类
│   ├── wechat-csv-parser.ts # CSV 解析器（自动编码检测）
│   └── wechat-xlsx-parser.ts# XLSX 解析器
├── hooks/                   # 自定义 hooks（主题、颜色方案）
├── constants/               # 主题常量（颜色、字体、间距）
└── global.css               # Web 端 CSS 字体变量
```

## 数据库设计

### categories 表

| 字段 | 说明 |
|------|------|
| id 1-8 | 系统预置分类，不可删除 |
| channel | online / offline，线下收入仅"现金收入" |
| source | wechat / manual / both |

系统分类：工资、奖金、微信转账、微信红包、微信商户收款、现金收入、投资收入、其他收入

### transactions 表

- `order_id` 唯一索引（部分索引），用于微信导入去重
- 目前仅处理收入（`type = 'income'`），支出结构已预留

## 微信账单导入流程

1. DocumentPicker 选择 CSV / XLSX 文件
2. 自动检测编码（UTF-8 / GBK），papaparse / xlsx 解析
3. 仅提取"收入"类型记录
4. `order_id` 去重（先查询已有集合，跳过重复）
5. 按交易类型自动归类（红包→id=4, 转账→id=3, 商户收款→id=5, 其他→id=8）
6. 逐条插入，order_id 重复异常静默跳过

## License

MIT
