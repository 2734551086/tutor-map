import { Router } from 'express'

const router = Router()

const WEB_API_KEY = process.env.AMAP_WEB_KEY

async function proxyAmap(path, params) {
  if (!WEB_API_KEY) {
    throw new Error('后端未配置 AMAP_WEB_KEY，无法调用高德 Web服务接口')
  }
  const qs = new URLSearchParams({ key: WEB_API_KEY, ...params })
  const res = await fetch(`https://restapi.amap.com${path}?${qs}`)
  return res.json()
}

function parseLocation(str) {
  if (!str) return null
  const [lng, lat] = String(str).split(',').map(Number)
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  return { lat, lng }
}

router.get('/inputtips', async (req, res) => {
  const { keywords = '', city = '武汉' } = req.query
  if (!keywords.trim()) return res.json({ status: '0', info: '缺少关键词', tips: [] })
  try {
    const data = await proxyAmap('/v3/assistant/inputtips', {
      keywords: keywords.trim(),
      city: String(city),
      citylimit: 'true',
    })
    const tips = (data.tips || []).filter(t => t.name).map(t => ({
      name: t.name + (t.district && !t.name.includes(t.district) ? `（${t.district}）` : ''),
      rawName: t.name,
      district: t.district || '',
      address: t.address || '',
      location: parseLocation(t.location),
    }))
    res.json({ status: data.status, info: data.info, tips })
  } catch (err) {
    res.status(502).json({ status: '0', info: err.message, tips: [] })
  }
})

router.get('/geocode', async (req, res) => {
  const { address = '', city = '武汉' } = req.query
  if (!address.trim()) return res.json({ status: '0', info: '缺少地址', geocodes: [] })
  try {
    const data = await proxyAmap('/v3/geocode/geo', {
      address: address.trim(),
      city: String(city),
    })
    const geocodes = (data.geocodes || []).map(g => ({
      name: g.formatted_address || g.name || '',
      location: parseLocation(g.location),
    }))
    res.json({ status: data.status, info: data.info, geocodes })
  } catch (err) {
    res.status(502).json({ status: '0', info: err.message, geocodes: [] })
  }
})

router.get('/regeo', async (req, res) => {
  const { location = '' } = req.query
  if (!location) return res.json({ status: '0', info: '缺少经纬度', regeocode: null })
  try {
    const data = await proxyAmap('/v3/geocode/regeo', { location: String(location) })
    const rc = data.regeocode
    res.json({
      status: data.status,
      info: data.info,
      regeocode: rc ? { formattedAddress: rc.formatted_address || '' } : null,
    })
  } catch (err) {
    res.status(502).json({ status: '0', info: err.message, regeocode: null })
  }
})

export default router