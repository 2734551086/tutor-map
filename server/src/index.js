import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import authRoutes from './routes/auth.js'
import requestRoutes from './routes/requests.js'
import messageRoutes from './routes/messages.js'
import geoRoutes from './routes/geo.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/geo', geoRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`[server] Tutor Map API running on http://localhost:${PORT}`)
})