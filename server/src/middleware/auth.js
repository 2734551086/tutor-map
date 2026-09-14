import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tutor-map-dev-secret-change-me'

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: '未登录' })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' })
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET)
    } catch {
      req.user = null
    }
  }
  next()
}