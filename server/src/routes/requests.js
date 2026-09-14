import { Router } from 'express'
import db from '../db.js'
import { authRequired, optionalAuth } from '../middleware/auth.js'

const router = Router()

const REQUEST_FIELDS = `
  r.id, r.user_id, r.title, r.subject, r.grade, r.student_situation,
  r.schedule, r.teacher_requirement, r.hourly_min, r.hourly_max,
  r.address, r.lat, r.lng, r.status, r.created_at,
  u.name AS poster_name, u.role AS poster_role
`

function toPublic(row) {
  return {
    ...row,
    poster: { id: row.user_id, name: row.poster_name, role: row.poster_role },
    poster_name: undefined,
    poster_role: undefined,
    user_id: undefined,
  }
}

router.get('/', optionalAuth, (req, res) => {
  const { bounds, subject, grade, status, keyword } = req.query
  const clauses = []
  const params = []

  if (status && status !== 'all') {
    clauses.push('r.status = ?')
    params.push(status)
  } else {
    clauses.push("r.status = 'open'")
  }

  if (subject && subject !== 'all') {
    clauses.push('r.subject = ?')
    params.push(subject)
  }

  if (grade && grade !== 'all') {
    clauses.push('r.grade = ?')
    params.push(grade)
  }

  if (keyword && keyword.trim()) {
    clauses.push('(r.title LIKE ? OR r.address LIKE ? OR r.student_situation LIKE ? OR r.teacher_requirement LIKE ?)')
    const kw = `%${keyword.trim()}%`
    params.push(kw, kw, kw, kw)
  }

  if (bounds) {
    const [swLat, swLng, neLat, neLng] = bounds.split(',').map(Number)
    if ([swLat, swLng, neLat, neLng].every(Number.isFinite)) {
      clauses.push('r.lat BETWEEN ? AND ?')
      clauses.push('r.lng BETWEEN ? AND ?')
      params.push(swLat, neLat, swLng, neLng)
    }
  }

  const sql = `
    SELECT ${REQUEST_FIELDS}
    FROM requests r
    JOIN users u ON u.id = r.user_id
    WHERE ${clauses.join(' AND ')}
    ORDER BY r.created_at DESC
  `
  const rows = db.prepare(sql).all(...params)
  res.json(rows.map(toPublic))
})

router.get('/meta/filters', (req, res) => {
  const subjects = db.prepare(
    "SELECT DISTINCT subject FROM requests WHERE status = 'open' ORDER BY subject"
  ).all().map(r => r.subject)
  const grades = db.prepare(
    "SELECT DISTINCT grade FROM requests WHERE status = 'open'"
  ).all().map(r => r.grade)
  const gradeOrder = [
    '幼儿园小班', '幼儿园中班', '幼儿园大班',
    '小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级',
    '初中一年级', '初中二年级', '初中三年级',
    '高中一年级', '高中二年级', '高中三年级',
    '成人',
  ]
  const rank = g => {
    const i = gradeOrder.indexOf(g)
    return i === -1 ? gradeOrder.length : i
  }
  grades.sort((a, b) => rank(a) - rank(b))
  res.json({ subjects, grades })
})

router.get('/:id', optionalAuth, (req, res) => {
  const row = db.prepare(`
    SELECT ${REQUEST_FIELDS}
    FROM requests r JOIN users u ON u.id = r.user_id
    WHERE r.id = ?
  `).get(req.params.id)
  if (!row) return res.status(404).json({ error: '需求不存在' })
  res.json(toPublic(row))
})

router.post('/', authRequired, (req, res) => {
  const {
    title, subject, grade, student_situation, schedule, teacher_requirement,
    hourly_min, hourly_max, address, lat, lng,
  } = req.body || {}

  const required = { title, subject, grade, student_situation, schedule, teacher_requirement, address }
  for (const [field, val] of Object.entries(required)) {
    if (!val || !String(val).trim()) {
      return res.status(400).json({ error: `字段 ${field} 不能为空` })
    }
  }
  if (!Number.isFinite(hourly_min) || !Number.isFinite(hourly_max) || hourly_min <= 0 || hourly_max < hourly_min) {
    return res.status(400).json({ error: '时薪范围无效' })
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: '请在地图上选择家教地址' })
  }

  const result = db.prepare(
    `INSERT INTO requests
     (user_id, title, subject, grade, student_situation, schedule, teacher_requirement,
      hourly_min, hourly_max, address, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    req.user.id, title.trim(), subject.trim(), grade.trim(), student_situation.trim(),
    schedule.trim(), teacher_requirement.trim(), hourly_min, hourly_max, address.trim(), lat, lng
  )

  const row = db.prepare(`
    SELECT ${REQUEST_FIELDS} FROM requests r JOIN users u ON u.id = r.user_id WHERE r.id = ?
  `).get(result.lastInsertRowid)

  res.status(201).json(toPublic(row))
})

router.put('/:id', authRequired, (req, res) => {
  const existing = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: '需求不存在' })
  if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权修改该需求' })
  }

  const b = req.body || {}
  db.prepare(`
    UPDATE requests SET
      title = ?, subject = ?, grade = ?, student_situation = ?, schedule = ?,
      teacher_requirement = ?, hourly_min = ?, hourly_max = ?, address = ?, lat = ?, lng = ?, status = ?
    WHERE id = ?
  `).run(
    b.title ?? existing.title,
    b.subject ?? existing.subject,
    b.grade ?? existing.grade,
    b.student_situation ?? existing.student_situation,
    b.schedule ?? existing.schedule,
    b.teacher_requirement ?? existing.teacher_requirement,
    b.hourly_min ?? existing.hourly_min,
    b.hourly_max ?? existing.hourly_max,
    b.address ?? existing.address,
    b.lat ?? existing.lat,
    b.lng ?? existing.lng,
    b.status ?? existing.status,
    existing.id
  )

  const row = db.prepare(`
    SELECT ${REQUEST_FIELDS} FROM requests r JOIN users u ON u.id = r.user_id WHERE r.id = ?
  `).get(existing.id)
  res.json(toPublic(row))
})

router.delete('/:id', authRequired, (req, res) => {
  const existing = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: '需求不存在' })
  if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权删除该需求' })
  }
  db.prepare('DELETE FROM requests WHERE id = ?').run(existing.id)
  res.json({ ok: true })
})

export default router