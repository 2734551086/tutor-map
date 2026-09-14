import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { signToken, authRequired } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, password, name, role, phone, wechat } = req.body || {}

  if (!username || !password || !name) {
    return res.status(400).json({ error: '用户名、密码和姓名不能为空' })
  }
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: '用户名需为3-20个字符' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' })
  }
  const validRoles = ['parent', 'tutor']
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: '角色必须是 parent 或 tutor' })
  }

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (exists) {
    return res.status(409).json({ error: '用户名已存在' })
  }

  const hash = bcrypt.hashSync(password, 10)
  const result = db.prepare(
    `INSERT INTO users (username, password_hash, name, role, phone, wechat)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(username, hash, name, role, phone || '', wechat || '')

  const user = db.prepare(
    'SELECT id, username, name, role, phone, wechat, created_at FROM users WHERE id = ?'
  ).get(result.lastInsertRowid)

  res.json({ token: signToken(user), user })
})

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' })
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }

  const safe = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    phone: user.phone,
    wechat: user.wechat,
    subjects: JSON.parse(user.subjects || '[]'),
    created_at: user.created_at,
  }
  res.json({ token: signToken(safe), user: safe })
})

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, name, role, phone, wechat, subjects, created_at FROM users WHERE id = ?'
  ).get(req.user.id)
  if (!user) return res.status(404).json({ error: '用户不存在' })
  res.json({ ...user, subjects: JSON.parse(user.subjects || '[]') })
})

// PUT /api/auth/profile
router.put('/profile', authRequired, (req, res) => {
  const { name, phone, wechat, subjects } = req.body || {}
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user) return res.status(404).json({ error: '用户不存在' })

  db.prepare(
    `UPDATE users SET name = ?, phone = ?, wechat = ?, subjects = ? WHERE id = ?`
  ).run(
    name ?? user.name,
    phone ?? user.phone,
    wechat ?? user.wechat,
    JSON.stringify(subjects ?? JSON.parse(user.subjects || '[]')),
    user.id
  )

  const updated = db.prepare(
    'SELECT id, username, name, role, phone, wechat, subjects, created_at FROM users WHERE id = ?'
  ).get(user.id)
  res.json({ ...updated, subjects: JSON.parse(updated.subjects || '[]') })
})

export default router