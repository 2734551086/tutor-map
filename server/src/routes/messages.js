import { Router } from 'express'
import db from '../db.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()

router.get('/conversations', authRequired, (req, res) => {
  const me = req.user.id
  const rows = db.prepare(`
    SELECT
      other.id AS user_id, other.name AS other_name, other.role AS other_role,
      m.content AS last_message, m.created_at AS last_time, m.is_read AS last_is_read,
      SUM(CASE WHEN m2.is_read = 0 AND m2.receiver_id = ? THEN 1 ELSE 0 END) AS unread_count
    FROM (
      SELECT
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_id,
        MAX(id) AS last_msg_id
      FROM messages
      WHERE sender_id = ? OR receiver_id = ?
      GROUP BY other_id
    ) latest
    JOIN messages m ON m.id = latest.last_msg_id
    JOIN users other ON other.id = latest.other_id
    LEFT JOIN messages m2 ON m2.sender_id = other.id AND m2.receiver_id = ? AND m2.is_read = 0
    GROUP BY other.id
    ORDER BY m.created_at DESC
  `).all(me, me, me, me, me)
  res.json(rows)
})

router.get('/:userId', authRequired, (req, res) => {
  const me = req.user.id
  const other = Number(req.params.userId)
  const rows = db.prepare(`
    SELECT * FROM messages
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    ORDER BY id ASC
  `).all(me, other, other, me)

  db.prepare(
    'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0'
  ).run(other, me)
  res.json(rows)
})

router.post('/', authRequired, (req, res) => {
  const { receiver_id, request_id, content } = req.body || {}
  if (!receiver_id || !content || !String(content).trim()) {
    return res.status(400).json({ error: '接收者和消息内容不能为空' })
  }
  const result = db.prepare(
    `INSERT INTO messages (sender_id, receiver_id, request_id, content)
     VALUES (?, ?, ?, ?)`
  ).run(req.user.id, receiver_id, request_id || null, String(content).trim())
  res.status(201).json(db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid))
})

export default router