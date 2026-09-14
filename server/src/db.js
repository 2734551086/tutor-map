import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'tutor.db')

fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ─── Schema ─────────────────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'tutor',      -- 'parent' | 'tutor'
  phone         TEXT DEFAULT '',
  wechat        TEXT DEFAULT '',
  subjects      TEXT DEFAULT '[]',                  -- JSON array for tutors
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS requests (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL REFERENCES users(id),
  title              TEXT NOT NULL,
  subject            TEXT NOT NULL,
  grade              TEXT NOT NULL,
  student_situation  TEXT NOT NULL,
  schedule           TEXT NOT NULL,
  teacher_requirement TEXT NOT NULL,
  hourly_min         INTEGER NOT NULL,
  hourly_max         INTEGER NOT NULL,
  address            TEXT NOT NULL,
  lat                REAL NOT NULL,
  lng                REAL NOT NULL,
  status             TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'closed'
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id   INTEGER NOT NULL REFERENCES users(id),
  receiver_id INTEGER NOT NULL REFERENCES users(id),
  request_id  INTEGER REFERENCES requests(id),
  content     TEXT NOT NULL,
  is_read     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_requests_latlng ON requests(lat, lng);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_messages_convo ON messages(sender_id, receiver_id);
`)

// ─── Seed demo data (only when empty) ───────────────────────────────────────
const count = db.prepare('SELECT COUNT(*) AS c FROM requests').get()
if (count.c === 0) {
  const hash = bcrypt.hashSync('demo123', 10)

  const insertUser = db.prepare(
    `INSERT INTO users (username, password_hash, name, role, phone, wechat, subjects)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  const parentDemo = insertUser.run('demo_parent', hash, '王爸爸', 'parent', '13800138001', 'demo_parent_wx', '[]')
  insertUser.run('demo_tutor', hash, '李老师', 'tutor', '13800138002', 'demo_tutor_wx', '["数学","物理"]')

  const seedData = [
    // 【武昌区 - 光谷广场】
    ['高一数学三角函数薄弱，想提分', '数学', '高一', '期中数学68分，三角函数和函数概念理解困难，做题慢', '每周六下午2-4点，可长期', '重点大学数学专业在读或毕业，有耐心，女老师优先', 120, 180, '光谷广场 珞喻路889号', 30.505, 114.403],
    // 【洪山区 - 街道口】
    ['六年级英语小升初冲刺', '英语', '六年级', '英语基础尚可但听力口语弱，希望集中提升', '暑假每天上午9-11点，连续3周', '英语专业优先，发音标准，有小学教学经验', 100, 150, '街道口 珞狮路 群光广场', 30.523, 114.352],
    // 【武昌区 - 武汉大学附近】
    ['初三物理中考冲刺', '物理', '初三', '物理力学电学基础薄弱，月考72分，目标中考95+', '每周日全天可调配，周三晚上7-9点', '理工科大学生或物理专业，熟悉中考考点', 150, 220, '武大 珞珈山 茶港小区', 30.541, 114.361],
    // 【洪山区 - 光谷软件园】
    ['小学二年级语文阅读写作', '语文', '小学二年级', '识字量低于同龄，不爱阅读，需趣味引导', '周二、周四下午4:30-6:00', '师范类女生，性格活泼有亲和力', 80, 120, '光谷软件园 关山大道', 30.492, 114.402],
    // 【江夏区 - 藏龙岛】
    ['高二化学选考提升', '化学', '高二', '化学选考，有机化学部分薄弱，希望系统梳理知识点', '每周五晚7-9点、周六下午', '化学相关专业，有选考教学经验', 200, 300, '藏龙岛 湖北经济学院旁', 30.401, 114.383],
    // 【东湖高新区 - 未来科技城】
    ['一年级奥数思维启蒙', '数学', '小学一年级', '孩子对数学有兴趣，想系统学习奥数思维', '每周三、周六各1.5小时', '有奥数教学经验，童趣活泼', 100, 150, '未来科技城 光谷七路', 30.492, 114.518],
    // 【武昌区 - 楚河汉街】
    ['初三英语口语强化', '英语', '初三', '口语表达弱，中考听说考试需要系统训练', '周一、周五晚6:30-8:00', '英语口语流利，有留学背景优先', 180, 250, '楚河汉街 万达广场', 30.554, 114.336],
    // 【东西湖区 - 金银湖】
    ['五年级数学应用题专项', '数学', '五年级', '应用题理解能力弱，审题不清', '周六上午9-11点', '数学教育专业优先，讲解清晰', 90, 130, '金银湖 万科四季花城', 30.643, 114.211],
    // 【武昌区 - 中南路】
    ['高三物理专题复习', '物理', '高三', '高考物理目标90+，电磁感应大题失分严重', '每周六下午、周日上午', '重点大学物理专业，熟悉近三年高考题型', 250, 350, '中南路 财神广场', 30.536, 114.329],
    // 【江岸区 - 百步亭】
    ['四年级语文作文提升', '语文', '四年级', '作文流水账，缺乏细节描写能力', '每周日下午2-4点', '汉语言文学专业，有作文教学经验', 100, 140, '百步亭花园 温馨苑', 30.653, 114.333],
    // 【洪山区 - 关山大道大学园路】
    ['初一数学+英语同步辅导', '数学', '初一', '小升初后成绩下滑，需要全科辅导', '周一至周五晚6-8点（可选2-3天）', '师范类或理工科在校生，认真负责', 130, 180, '关山大道 华科园', 30.489, 114.405],
    // 【汉阳区 - 王家湾】
    ['幼儿园大班拼音和数学启蒙', '数学', '幼儿园大班', '幼小衔接，拼音和简单加减法', '周一到周五下午4-5点', '学前教育专业，有亲和力', 70, 100, '王家湾 摩尔城', 30.560, 114.208],
    // 【武昌区 - 司门口】
    ['初二物理+化学提升', '物理', '初中二年级', '物理化学平均分80左右，希望提升到85+', '周三晚、周六下午', '理工科优先，熟悉武汉教材', 150, 200, '司门口 解放路', 30.545, 114.299],
    // 【黄陂区 - 盘龙城】
    ['高三英语读写冲刺', '英语', '高三', '阅读理解和写作丢分多，高考冲刺', '寒假期间每天上午', '英语专业研究生优先，有高考辅导经验', 220, 300, '盘龙城 奥特莱斯', 30.693, 114.267],
    // 【江汉区 - 汉口火车站附近】
    ['钢琴陪练（每周2次）', '其他', '小学三年级', '学琴2年，需要陪练纠错', '周二、周五晚7-8:30', '钢琴十级或音乐专业，耐心细致', 100, 150, '汉口火车站 后襄河', 30.622, 114.257],
    // 【洪山区 - 南湖】
    ['高一物理+数学', '物理', '高一', '中考后成绩中等，希望稳中提升', '每周六下午2-6点', '理科强的大学生，讲课生动', 140, 200, '南湖 保利心语', 30.479, 114.350],
    // 【武昌区 - 积玉桥】
    ['初三科学班冲刺', '科学', '初中三年级', '理科综合面对中考', '周日下午3-5点', '理科专业，了解中考要求', 180, 260, '积玉桥 万达公馆', 30.564, 114.316],
  ]

  const insertStmt = db.prepare(
    `INSERT INTO requests
     (user_id, title, subject, grade, student_situation, schedule, teacher_requirement,
      hourly_min, hourly_max, address, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const seedTx = db.transaction(() => {
    for (const r of seedData) {
      insertStmt.run(parentDemo.lastInsertRowid, ...r)
    }
  })
  seedTx()
  console.log(`[db] Seeded ${seedData.length} demo requests`)
}

export default db