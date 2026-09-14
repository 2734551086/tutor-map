import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import authRoutes from './routes/auth.js'
import requestRoutes from './routes/requests.js'
import messageRoutes from './routes/messages.js'
import geoRoutes from './routes/geo.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/geo', geoRoutes)

// 托管前端静态文件（生产环境：Vite build 产物在 server/public）
const publicDir = path.join(__dirname, '../public')
app.use(express.static(publicDir))

// SPA fallback：非 /api 的 GET 请求返回 index.html
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(publicDir, 'index.html'), err => {
    if (err) next()
  })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`[server] Tutor Map API running on http://localhost:${PORT}`)
})