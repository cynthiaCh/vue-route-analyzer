# 📦 vue-route-analyzer

一个用于快速分析 Vue 2 项目路由配置文件的小工具，支持提取路由数量、命名情况、组件加载方式、`keepAlive` 使用情况、路径前缀分布等信息。

> 🔍 适用于 Vue 2 + Vue-Router 的项目，基于 AST 解析，无需运行项目即可静态分析路由资产。

## ✨ 特性

- 统计命名与未命名路由数量
- 检测重复的 `name` 值
- 识别动态 `component` 引入（如 `() => import(...)`）
- 分析 `meta.keepAlive`、`meta.flag` 使用情况
- 路由 `props` 配置分析
- 输出路径前缀分布（如 `/plan`、`/market`）

## 📦 安装依赖

```bash
npm install @babel/parser @babel/traverse chalk
```

## Usage

```bash
在项目根目录运行：
node analyze-router.js ./src/router/index.js
```

## Output Example

```
📦 路由资产分析
├─ 总路由数量：134
├─ 命名路由：120
├─ 未命名路由：14
├─ 含 keepAlive：67
├─ 动态组件：45
├─ 含 props 配置：20
├─ 重复 name：
│    ⚠️  myPlan (2 次)
├─ 路径前缀统计：
│    /plan - 22 个
│    /market - 17 个
├─ 含 flag 页：
│    /app/detail => flag=4

✅ 分析完成

```

## TODO
支持目录结构可视化（HTML/Graph 输出）
统计各组件引用频次

---

🙋‍♀️ 作者 Author
Created with ☕ by 喝拿铁的桔子
GitHub: @cynthiaCh
如果你喜欢这个项目，欢迎 Star ⭐ 支持

Created with ☕ by [喝拿铁的桔子](https://juejin.cn/user/3526889032395613)
