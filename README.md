# 📚 家教地图 (Tutor Map)

仿照 [风信子家教中心](https://fxzjjzx.cn/requests) 的家教需求地图平台。在地图上浏览、搜索、筛选身边的家教需求，家长可发布需求，教员可联系接单。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Vite + Pinia + Vue Router |
| 地图 | 高德地图 JS API 2.0 (`@amap/amap-jsapi-loader`)，仅用于渲染 |
| 搜索/地理编码 | 后端代理调用高德 Web 服务 API（双 Key 架构，见下文） |
| 后端 | Node.js + Express + better-sqlite3 |
| 认证 | JWT + bcrypt |
| 部署 | 前端 Vercel / Netlify，后端 Railway / Render / 服务器 |

## 项目结构

```
tutor-map/
├── src/                    # 前端
│   ├── api/index.js        # axios实例(自动带token、统一错误处理)
│   ├── stores/auth.js      # Pinia 登录状态
│   ├── router/index.js     # 路由(登录守卫)
│   ├── components/
│   │   ├── MapView.vue     # 高德地图封装(标记/聚合/选点)
│   │   └── RequestCard.vue # 需求卡片
│   └── views/
│       ├── RequestsMap.vue # 主页：地图+搜索+筛选+需求列表
│       ├── Login.vue / Register.vue
│       ├── CreateRequest.vue # 发布需求(地图选点)
│       ├── Messages.vue   # 站内聊天(轮询)
│       └── Profile.vue    # 个人中心
├── server/                 # 后端
│   └── src/
│       ├── index.js       # Express入口 (端口3001)
│       ├── db.js          # SQLite + 自动seed演示数据(武汉)
│       ├── middleware/auth.js # JWT
│       └── routes/        # auth / requests / messages / geo
```

## 双 Key 架构（重要）

高德控制台**不允许一个 Key 同时勾选「Web端(JS API)」和「Web服务」两个平台**，因此项目采用双 Key：

| Key | 平台 | 用途 | 存放位置 |
|---|---|---|---|
| `VITE_AMAP_KEY` | Web端(JS API) | 前端地图渲染 | 前端 `.env`（会被打进前端包，可暴露） |
| `AMAP_WEB_KEY` | Web服务 | 搜索/地理编码（走后端代理，不暴露） | 后端 `server/.env` |

搜索建议、地址解析全部通过后端 `/api/geo/*` 代理调用高德 Web 服务 API，前端不再直接调用 AMap 搜索插件（也规避了 `USERKEY_PLAT_NOMATCH` 平台不匹配错误）。

## 快速开始

### 1. 申请高德地图 Key（必做，需要 2 个）

1. 打开 [高德开放平台](https://console.amap.com/dev/key/app) （需注册/登录阿里云账号，个人开发者即可免费使用）
2. 「应用管理」→「创建新应用」
3. 在应用内**添加 2 个 Key**（注意：JS API 和 Web服务不能共用同一个 Key，需分开创建）：
   - **Key A — Web端(JS API)**：用于前端地图渲染。勾选「Web端(JS API)」，按提示设置安全密钥并配置域名白名单
   - **Key B — Web服务**：用于后端搜索代理。勾选「Web服务」，无需安全密钥
4. 两个 Key 分别填入下面的环境变量

### 2. 配置环境变量

```bash
# 前端（项目根目录）：复制配置模板
cp .env.example .env
vim .env
```

前端 `.env` 内容：

```env
VITE_AMAP_KEY=你的Web端JSAPI_Key
VITE_AMAP_SECURITY_CODE=你的安全密钥    # 如控制台已配置安全密钥，必填
VITE_API_BASE=/api                     # 本地开发走 Vite 代理
```

后端 `server/.env` 内容（新建）：

```env
AMAP_WEB_KEY=你的Web服务_Key
PORT=3001
```

### 3. 启动后端

```bash
cd server
npm install
npm run dev        # http://localhost:3001
```

首次启动会自动创建 SQLite 数据库并写入 17 条武汉演示数据。

### 4. 启动前端

```bash
cd ..              # 回到项目根目录
npm install
npm run dev        # http://localhost:5173
```

打开浏览器访问 http://localhost:5173 即可看到地图页。

**演示账号**：`demo_parent` / `demo123`（家长）、`demo_tutor` / `demo123`（教员）

## API 一览

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/register` | 注册（role: parent/tutor） |
| POST | `/api/auth/login` | 登录，返回 JWT |
| GET | `/api/auth/me` | 当前用户 |
| PUT | `/api/auth/profile` | 更新资料 |
| GET | `/api/requests?bounds=swLat,swLng,neLat,neLng&subject=&grade=&keyword=` | 按地图范围+筛选查需求 |
| GET | `/api/requests/meta/filters` | 科目/年级筛选选项 |
| GET | `/api/requests/:id` | 需求详情 |
| POST | `/api/requests` | 发布需求（需登录） |
| PUT | `/api/requests/:id` | 修改需求（仅发布者） |
| DELETE | `/api/requests/:id` | 删除需求（仅发布者） |
| GET | `/api/messages/conversations` | 会话列表（含未读数） |
| GET | `/api/messages/:userId` | 与某用户的聊天记录（自动标记已读） |
| POST | `/api/messages` | 发送消息 |
| GET | `/api/geo/inputtips?keywords=&city=` | 地址输入提示（搜索建议） |
| GET | `/api/geo/geocode?address=` | 地理编码：地址→坐标 |
| GET | `/api/geo/regeo?location=lng,lat` | 逆地理编码：坐标→地址 |

## 地图功能详解

- **地图加载**：`MapView.vue` 通过 `@amap/amap-jsapi-loader` 异步加载 JS API 2.0
- **标记**：每个需求一个自定义图案 Marker（水滴 + ¥）
- **聚合**：缩放级别低时用 `AMap.MarkerClusterer` 聚合点，点击聚合放大查看
- **视野查询**：地图移动/缩放后 `moveend` 事件 → 取 `getBounds()` 的西南/东北角 → 传给后端按范围查需求
- **搜索建议**：主页搜索框输入 → 前端调 `/api/geo/inputtips`（后端代理 Web 服务 API）→ 返回武汉地名候选列表
- **地址逆解析**：选点后调 `/api/geo/regeo`（后端代理）把坐标转成文字地址
- **地图选点**：发布需求时地图处于 pickMode，点击地图 `map.on('click')` 落一个红色标记

## 部署指南

### 前端 → Vercel

1. 把代码推到 GitHub 仓库
2. 在 [Vercel](https://vercel.com) 中 `New Project` → 导入该仓库
3. 框架选择 **Vite**（Vercel 会自动识别）
4. 在 **Environment Variables** 中添加：
   - `VITE_AMAP_KEY` = 你的 Web端(JS API) Key
   - `VITE_AMAP_SECURITY_CODE` = 你的安全密钥
   - `VITE_API_BASE` = 你的后端线上地址（如 `https://tutor-api.up.railway.app/api`）
5. Deploy 完成 ✅

> ⚠️ 高德 key 有域名白名单限制：在[高德控制台](https://console.amap.com/dev/key/app)建议开启「域名白名单」并填入你的 Vercel 域名，防止别人盗用你的 Key。

### 后端 → Railway

SQLite 方案最简单，直接部署一台 Node 服务器：

1. 把 `server/` 单独推一个仓库（或在其根目录部署）
2. [Railway](https://railway.app) 中 New Project → Deploy from GitHub repo → 选择 server 目录
3. 构建命令 `npm install`，启动命令 `npm start`
4. **Environment Variables** 中添加：`AMAP_WEB_KEY` = 你的 Web服务 Key
5. 自动分配域名 `https://xxx.up.railway.app`，把它填到 Vercel 的 `VITE_API_BASE`
6. ⚠️ Railway 免费实例会休眠，可用 [UptimeRobot](https://uptimerobot.com) 每 5 分钟 ping 一次防止休眠

> SQLite 数据存在磁盘上，Railway 重启后可能丢失（免费计划）。若要持久化，建议在 [Railway 的 Volume](https://docs.railway.com/reference/volumes) 中给数据目录挂载持久卷，或换 PostgreSQL。

### 后端 → 自有服务器

```bash
cd server
npm install
npm run start          # 建议用 pm2 守护
```

## 常见问题

**地图空白？**
- 检查 `.env` 是否已填 `VITE_AMAP_KEY` 和 `VITE_AMAP_SECURITY_CODE`，并重启 dev server
- 检查控制台是否有 `AMapLoader` 报错（Key 无效 / 未配置域名白名单 / 安全密钥缺失）

**搜索/地址建议无结果？**
- 检查后端 `server/.env` 是否填了 `AMAP_WEB_KEY`（Web服务 Key）
- 用浏览器直接访问 `http://localhost:3001/api/geo/inputtips?keywords=光谷&city=武汉` 测试后端代理是否正常

**为什么部署后地图也不显示？**
- Vercel 构建时要设置环境变量 `VITE_AMAP_KEY`（构建时注入，改完要重新 Deploy）
- 高德控制台确认该 Key 的域名白名单包含你的线上域名

**数据会丢吗？**
- 本地开发数据存在 `server/data/tutor.db`，不会丢
- Railway 免费版磁盘不持久，重启会回到 seed 数据（可挂 Volume 解决）

## 后续可扩展

- [ ] 微信扫码登录 / 微信客服联系（参考站模式：点击需求复制微信号）
- [ ] AI 匹配（根据教员资料推荐需求）
- [ ] 需求收藏 / 关注提醒
- [ ] 实时消息（WebSocket 替代轮询）
- [ ] 图片上传（学员试卷、教材等）