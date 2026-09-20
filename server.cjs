const express = require('express')
const path = require('path')
const fs = require('fs')
const os = require('os')
const axios = require('axios')
const QRCode = require('qrcode')

// ── 0. 全局异常保护与初始化 dataDir ──
process.on('uncaughtException', (err) => {
  console.error('[Process Exception]', err.message)
})
process.on('unhandledRejection', (reason) => {
  console.error('[Process Rejection]', reason)
})

// 中国大陆真实高可用 IP 池生成器（确保在开启任何梯子或海外网络下均可顺畅访问网易云）
function getRandomChinaIP() {
  const chinaIPRanges = [
    ['116.25.0.0', '116.25.255.255'],    // 广东电信
    ['183.14.0.0', '183.14.255.255'],    // 广东电信
    ['223.73.0.0', '223.73.255.255'],    // 广东移动
    ['114.80.0.0', '114.95.255.255'],    // 上海电信
    ['120.204.0.0', '120.204.255.255'],  // 上海移动
    ['123.112.0.0', '123.127.255.255'],  // 北京联通
    ['218.240.0.0', '218.241.255.255'],  // 北京联通
    ['117.136.0.0', '117.136.255.255'],  // 浙江移动
    ['122.224.0.0', '122.228.255.255'],  // 浙江电信
    ['218.88.0.0', '218.90.255.255'],    // 四川电信
  ]
  const range = chinaIPRanges[Math.floor(Math.random() * chinaIPRanges.length)]
  const start = range[0].split('.').map(Number)
  const end = range[1].split('.').map(Number)
  return [
    Math.floor(Math.random() * (end[0] - start[0] + 1)) + start[0],
    Math.floor(Math.random() * (end[1] - start[1] + 1)) + start[1],
    Math.floor(Math.random() * (end[2] - start[2] + 1)) + start[2],
    Math.floor(Math.random() * (end[3] - start[3] + 1)) + start[3],
  ].join('.')
}
global.cnIp = getRandomChinaIP()

const dataDir = path.join(os.homedir(), '.freedom-music')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const cacheDir = path.join(dataDir, 'cache')
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })

const playlistsDir = path.join(dataDir, 'playlists')
if (!fs.existsSync(playlistsDir)) fs.mkdirSync(playlistsDir, { recursive: true })

function sanitizeKey(key) {
  if (typeof key !== 'string') return ''
  return key.replace(/[^a-zA-Z0-9_-]/g, '')
}

// 预创建系统临时目录下的 anonymous_token，防止 NCM 依赖加载时抛出 ENOENT 异常
const tmpAnonToken = path.join(os.tmpdir(), 'anonymous_token')
if (!fs.existsSync(tmpAnonToken)) {
  try { fs.writeFileSync(tmpAnonToken, '', 'utf-8') } catch {}
}

const MIN_STORAGE = 500 * 1024 * 1024      // 500 MB
const MAX_STORAGE = 10 * 1024 * 1024 * 1024 // 10 GB
const DEFAULT_STORAGE_LIMIT = 2 * 1024 * 1024 * 1024 // 2 GB 默认

const anonTokenFile = path.join(dataDir, 'anonymous_token')
const sessionCookieFile = path.join(dataDir, 'session_cookie')
const configFile = path.join(dataDir, 'config.json')

if (!fs.existsSync(anonTokenFile)) fs.writeFileSync(anonTokenFile, '', 'utf-8')
if (!fs.existsSync(sessionCookieFile)) fs.writeFileSync(sessionCookieFile, '', 'utf-8')

let anonymousToken = fs.readFileSync(anonTokenFile, 'utf-8').trim()
let sessionCookie = fs.readFileSync(sessionCookieFile, 'utf-8').trim()

function saveSessionCookie(str) {
  sessionCookie = str
  fs.writeFileSync(sessionCookieFile, str, 'utf-8')
  console.log('[Session] cookie saved:', str.split(';').map(s => s.trim().split('=')[0]).join(', '))
}

function clearSessionCookie() {
  sessionCookie = ''
  fs.writeFileSync(sessionCookieFile, '', 'utf-8')
  console.log('[Session] cookie cleared')
}

// 配置管理
function readConfig() {
  try {
    if (fs.existsSync(configFile)) {
      return JSON.parse(fs.readFileSync(configFile, 'utf-8'))
    }
  } catch (e) { console.error('[Config] Read error:', e.message) }
  return {}
}

function writeConfig(config) {
  try {
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8')
  } catch (e) { console.error('[Config] Write error:', e.message) }
}

function getDirSize(dir) {
  let total = 0
  try {
    const files = fs.readdirSync(dir)
    for (const f of files) {
      const p = path.join(dir, f)
      const stat = fs.statSync(p)
      if (stat.isDirectory()) total += getDirSize(p)
      else total += stat.size
    }
  } catch { /* ignore */ }
  return total
}

// ── 1. 导入 weapi 加密 ──
const { weapi } = require(path.join(__dirname, 'node_modules', 'NeteaseCloudMusicApi', 'util', 'crypto.js'))

// ── 2. 导入其余工具（用于非登录 API）──
const ncmRequest = require(path.join(__dirname, 'node_modules', 'NeteaseCloudMusicApi', 'util', 'request.js'))
const { getModulesDefinitions } = require(path.join(__dirname, 'node_modules', 'NeteaseCloudMusicApi', 'server.js'))
const { cookieToJson } = require(path.join(__dirname, 'node_modules', 'NeteaseCloudMusicApi', 'util', 'index.js'))
const decode = require('safe-decode-uri-component')

// ── 3. 辅助函数 ──
const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
const randStr = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
const deviceId = () => Array.from({ length: 52 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('')

const NETEASE_REFERER = 'https://music.163.com'
const NETEASE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'

function buildCookie(override) {
  const cookie = {
    os: 'pc',
    osver: 'Microsoft-Windows-10-Professional-build-19045-64bit',
    appver: '3.1.17.204416',
    channel: 'netease',
    deviceId: deviceId(),
  }
  if (anonymousToken) cookie.MUSIC_A = anonymousToken
  if (override) Object.assign(cookie, override)
  return cookie
}

function cookieObjToString(obj) {
  return Object.entries(obj)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('; ')
}

// 从 session cookie 字符串构建对象
function getSessionCookieObj() {
  if (!sessionCookie) return {}
  const obj = {}
  for (const pair of sessionCookie.split(';')) {
    const [k, ...rest] = pair.split('=')
    if (k && rest.length) obj[k.trim()] = rest.join('=').trim()
  }
  return obj
}

// ── 4. 直连网易云 weapi 请求（自动绕过环境变量代理干扰并注入国内公网 IP）──
async function directWeapiRequest(apiPath, data, useSession = false, retry = 1) {
  const encrypted = weapi(data)
  const body = new URLSearchParams(encrypted).toString()
  const cnIp = global.cnIp || getRandomChinaIP()

  const override = useSession ? getSessionCookieObj() : {}
  try {
    const res = await axios({
      method: 'POST',
      url: `https://music.163.com/weapi${apiPath}`,
      proxy: false, // 禁用 Node.js 环境变量全局代理，避免海外节点导致版权封锁
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': NETEASE_REFERER,
        'User-Agent': NETEASE_UA,
        'Cookie': cookieObjToString(buildCookie(override)),
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Origin': 'https://music.163.com',
        'X-Real-IP': cnIp,
        'X-Forwarded-For': cnIp,
      },
      data: body,
      responseType: 'json',
      timeout: 15000,
    })

    const result = res.data
    const setCookie = res.headers['set-cookie']
    if (setCookie && setCookie.length > 0) {
      result._setCookie = setCookie
    }
    return result
  } catch (err) {
    if (retry > 0) {
      global.cnIp = getRandomChinaIP()
      return directWeapiRequest(apiPath, data, useSession, retry - 1)
    }
    throw err
  }
}

// ── 5. 初始化 anonymous_token ──
async function initAnonymousToken() {
  if (anonymousToken) return
  try {
    const data = await directWeapiRequest('/register/anonimous', { username: '' })
    const setCookies = data._setCookie || []
    for (const c of setCookies) {
      const pair = c.split(';')[0].trim()
      if (pair.startsWith('MUSIC_A=')) {
        anonymousToken = pair.split('=')[1]
        fs.writeFileSync(anonTokenFile, anonymousToken, 'utf-8')
        console.log('[AnonToken] 已初始化:', anonymousToken.slice(0, 16) + '...')
        return
      }
    }
  } catch (e) {
    console.warn('[AnonToken] 初始化失败:', e.message)
  }
}

// ── 5.1 内存极速缓存 ──
const responseCache = new Map()
const CACHE_RULES = {
  '/playlist/detail': 10 * 60 * 1000,    // 10分钟
  '/playlist/track/all': 10 * 60 * 1000, // 10分钟
  '/personalized': 15 * 60 * 1000,       // 15分钟
  '/toplist': 30 * 60 * 1000,            // 30分钟
  '/top/playlist': 15 * 60 * 1000,       // 15分钟
  '/top/song': 15 * 60 * 1000,           // 15分钟
  '/song/detail': 30 * 60 * 1000,        // 30分钟
  '/song/url': 10 * 60 * 1000,           // 10分钟
  '/lyric': 60 * 60 * 1000,              // 1小时
  '/artists': 30 * 60 * 1000,            // 30分钟
  '/artist/top/song': 30 * 60 * 1000,     // 30分钟
  '/album': 30 * 60 * 1000,              // 30分钟
}

function getCacheKey(req) {
  const url = req.originalUrl || req.url
  return req.method + ':' + url.replace(/^\/api/, '')
}

function cacheMiddleware(req, res, next) {
  const cleanPath = (req.path || '').replace(/^\/api/, '')
  const ttl = CACHE_RULES[cleanPath]
  if (!ttl || req.method !== 'GET') return next()

  const key = getCacheKey(req)
  const hit = responseCache.get(key)
  if (hit && Date.now() - hit.ts < ttl) {
    console.log('[Memory Cache HIT 🚀]', key)
    return res.status(hit.status).json(hit.body)
  }

  const originalJson = res.json.bind(res)
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300 && body) {
      responseCache.set(key, { status: res.statusCode, body, ts: Date.now() })
    }
    return originalJson(body)
  }
  next()
}

// 定期清理过期缓存（每 10 分钟清理一次内存）
setInterval(() => {
  const now = Date.now()
  const MS_PER_DAY = 86400000
  // 清理内存缓存
  for (const [key, val] of responseCache) {
    if (now - val.ts > 30 * 60 * 1000) responseCache.delete(key)
  }
  // 清理磁盘缓存（7天过期）
  try {
    const files = fs.readdirSync(cacheDir)
    for (const f of files) {
      if (!f.endsWith('.json')) continue
      const datePart = f.split('_')[0]
      if (!datePart || datePart.length !== 10) continue
      const fileDate = new Date(datePart).getTime()
      if (isNaN(fileDate)) continue
      if (now - fileDate > 7 * MS_PER_DAY) {
        fs.unlinkSync(path.join(cacheDir, f))
        console.log('[Cache] 定时清理过期缓存:', f)
      }
    }
  } catch {}
}, 10 * 60 * 1000)

// ── 6. 启动服务器 ──
async function start() {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))
  app.use(cacheMiddleware)

  global.cnIp = getRandomChinaIP()
  await initAnonymousToken()

  // ── 7. 登录状态 ──
  app.get('/login/status', (req, res) => {
    if (sessionCookie) {
      const obj = getSessionCookieObj()
      res.json({ code: 200, logged: true, keys: Object.keys(obj) })
    } else {
      res.json({ code: 200, logged: false })
    }
  })

  // ── 8. 退出登录 ──
  app.get('/logout', (req, res) => {
    clearSessionCookie()
    res.json({ code: 200, message: '已退出登录' })
  })

  // ── 9. QR 登录 ──
  app.all('/login/qr/key', async (req, res) => {
    try {
      const data = await directWeapiRequest('/login/qrcode/unikey', { type: 3 })
      res.status(200).json({ code: 200, data })
    } catch (err) {
      console.error('[QR Key]', err?.response?.data || err.message)
      res.status(500).json({ code: 500, msg: '获取二维码 key 失败', detail: err.message })
    }
  })

  app.all('/login/qr/create', async (req, res) => {
    const key = req.query.key || req.body?.key
    const qrimg = req.query.qrimg || req.body?.qrimg
    if (!key) return res.status(400).json({ code: 400, msg: '缺少 key' })
    try {
      const qrurl = `https://music.163.com/login?codekey=${key}`
      const result = { code: 200, data: { qrurl, qrimg: '' } }
      if (qrimg === 'true' || qrimg === '1') {
        result.data.qrimg = await QRCode.toDataURL(qrurl)
      }
      res.status(200).json(result)
    } catch (err) {
      console.error('[QR Create]', err.message)
      res.status(500).json({ code: 500, msg: '生成二维码失败' })
    }
  })

  app.all('/login/qr/check', async (req, res) => {
    const key = req.query.key || req.body?.key
    if (!key) return res.status(400).json({ code: 400, msg: '缺少 key' })
    try {
      const data = await directWeapiRequest('/login/qrcode/client/login', { key, type: 3 })
      const code = data.code ?? 802

      const setCookies = data._setCookie || []
      const needed = new Set(['MUSIC_U', 'MUSIC_A', 'NMTID', '__csrf'])
      const cookieMap = {}
      for (const c of setCookies) {
        const pair = c.split(';')[0].trim()
        const eqIdx = pair.indexOf('=')
        if (eqIdx < 0) continue
        const name = pair.substring(0, eqIdx)
        if (needed.has(name)) cookieMap[name] = pair
      }

      if (code === 803) {
        const cookieStr = Object.values(cookieMap).join('; ')
        saveSessionCookie(cookieStr)
      }

      const resp = { code, message: data.message || '' }
      if (data.nickname) resp.nickname = data.nickname
      if (data.avatarUrl) resp.avatarUrl = data.avatarUrl
      console.log('[QR Check]', code, data.message)
      res.status(200).json(resp)
    } catch (err) {
      console.error('[QR Check]', err?.response?.data || err.message)
      res.status(200).json({ code: 800, message: '二维码已过期' })
    }
  })

  // ── 10. 配置管理（本地硬盘存储）──
  app.get('/config', (req, res) => {
    const config = readConfig()
    const size = getDirSize(dataDir)
    const limit = config.storage_limit || DEFAULT_STORAGE_LIMIT
    res.json({ code: 200, data: config, dir: dataDir, size, limit })
  })

  app.post('/config/:key', (req, res) => {
    const key = req.params.key
    if (!key || ['__proto__', 'constructor', 'prototype'].includes(key)) {
      return res.status(400).json({ code: 400, msg: '非法键名' })
    }
    const config = readConfig()
    config[key] = req.body.value
    writeConfig(config)
    res.json({ code: 200 })
  })

  app.delete('/config/:key', (req, res) => {
    const key = req.params.key
    if (!key || ['__proto__', 'constructor', 'prototype'].includes(key)) {
      return res.status(400).json({ code: 400, msg: '非法键名' })
    }
    const config = readConfig()
    delete config[key]
    writeConfig(config)
    res.json({ code: 200 })
  })

  // ── 10.1 每日缓存与本地歌单管理（本地硬盘存储）──
  function getLocalPlaylists(uid) {
    const safeUid = sanitizeKey(String(uid))
    if (!safeUid) return { subscribed: [], created: [] }
    const filePath = path.join(playlistsDir, `${safeUid}.json`)
    try {
      if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch {}
    return { subscribed: [], created: [] }
  }

  function saveLocalPlaylists(uid, data) {
    const safeUid = sanitizeKey(String(uid))
    if (!safeUid) return
    const filePath = path.join(playlistsDir, `${safeUid}.json`)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  // 获取本地歌单
  app.get('/local/playlists', (req, res) => {
    const uid = req.query.uid
    if (!uid) return res.status(400).json({ code: 400, msg: '缺少 uid' })
    assignCoversToPlaylists(uid)
    res.json({ code: 200, data: getLocalPlaylists(uid) })
  })

  // 创建歌单
  app.post('/local/playlists/create', (req, res) => {
    const { uid, name, description } = req.body
    if (!uid || !name) return res.status(400).json({ code: 400, msg: '缺少参数' })
    const data = getLocalPlaylists(uid)
    const id = Date.now()
    const playlist = { id, name, description: description || '', picUrl: getNextPlaylistCover(), trackCount: 0, playCount: 0, tracks: [] }
    data.created.push(playlist)
    saveLocalPlaylists(uid, data)
    res.json({ code: 200, data: playlist })
  })

  // 删除歌单
  app.post('/local/playlists/delete', (req, res) => {
    const { uid, playlistId } = req.body
    if (!uid || !playlistId) return res.status(400).json({ code: 400, msg: '缺少参数' })
    const data = getLocalPlaylists(uid)
    data.created = data.created.filter(p => p.id !== playlistId)
    saveLocalPlaylists(uid, data)
    res.json({ code: 200 })
  })

  // 添加歌曲到歌单
  app.post('/local/playlists/add-tracks', (req, res) => {
    const { uid, playlistId, tracks } = req.body
    if (!uid || !playlistId || !tracks?.length) return res.status(400).json({ code: 400, msg: '缺少参数' })
    const data = getLocalPlaylists(uid)
    const pl = [...data.subscribed, ...data.created].find(p => p.id === playlistId)
    if (!pl) return res.status(404).json({ code: 404, msg: '歌单不存在' })
    const existingIds = new Set(pl.tracks.map(t => t.id))
    const newTracks = tracks.filter(t => !existingIds.has(t.id))
    pl.tracks.push(...newTracks)
    pl.trackCount = pl.tracks.length
    saveLocalPlaylists(uid, data)
    res.json({ code: 200, data: pl })
  })

  // 从歌单移除歌曲
  app.post('/local/playlists/remove-tracks', (req, res) => {
    const { uid, playlistId, trackIds } = req.body
    if (!uid || !playlistId || !trackIds?.length) return res.status(400).json({ code: 400, msg: '缺少参数' })
    const data = getLocalPlaylists(uid)
    const pl = [...data.subscribed, ...data.created].find(p => p.id === playlistId)
    if (!pl) return res.status(404).json({ code: 404, msg: '歌单不存在' })
    const removeSet = new Set(trackIds)
    pl.tracks = pl.tracks.filter(t => !removeSet.has(t.id))
    pl.trackCount = pl.tracks.length
    saveLocalPlaylists(uid, data)
    res.json({ code: 200, data: pl })
  })
  const historyFile = path.join(dataDir, 'play_history.json')

  // 歌单封面图轮询分配（3种心情 × 7张 = 21张）
  const MOODS = ['happy', 'calm', 'sad']
  const COVERS_PER_MOOD = 7
  let coverCounter = 0

  function getNextPlaylistCover() {
    const index = coverCounter % (MOODS.length * COVERS_PER_MOOD)
    const mood = MOODS[Math.floor(index / COVERS_PER_MOOD)]
    const num = (index % COVERS_PER_MOOD) + 1
    coverCounter++
    return `/playlist-covers/${mood}/${num}.jpg`
  }

  function assignCoversToPlaylists(uid) {
    const data = getLocalPlaylists(uid)
    let changed = false
    const allPlaylists = [...data.subscribed, ...data.created]
    allPlaylists.forEach((pl, i) => {
      if (!pl.picUrl) {
        const idx = i % (MOODS.length * COVERS_PER_MOOD)
        const mood = MOODS[Math.floor(idx / COVERS_PER_MOOD)]
        const num = (idx % COVERS_PER_MOOD) + 1
        pl.picUrl = `/playlist-covers/${mood}/${num}.jpg`
        changed = true
      }
    })
    if (changed) saveLocalPlaylists(uid, data)
  }

  function readHistory() {
    try {
      if (fs.existsSync(historyFile)) {
        return JSON.parse(fs.readFileSync(historyFile, 'utf-8'))
      }
    } catch {}
    return []
  }

  function writeHistory(history) {
    try {
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf-8')
    } catch (e) { console.error('[History] Write error:', e.message) }
  }

  app.get('/history', (req, res) => {
    const history = readHistory()
    const limit = parseInt(req.query.limit) || 100
    res.json({ code: 200, data: history.slice(0, limit) })
  })

  app.post('/history', (req, res) => {
    const song = req.body
    if (!song || !song.id) {
      return res.status(400).json({ code: 400, msg: 'Missing song data' })
    }
    const history = readHistory()
    const existingIndex = history.findIndex((h) => h.id === song.id)
    if (existingIndex >= 0) {
      history.splice(existingIndex, 1)
    }
    history.unshift({
      id: song.id,
      name: song.name,
      ar: song.ar,
      al: song.al,
      dt: song.dt,
      playedAt: Date.now(),
    })
    if (history.length > 500) {
      history.length = 500
    }
    writeHistory(history)
    res.json({ code: 200 })
  })

  app.delete('/history', (req, res) => {
    writeHistory([])
    res.json({ code: 200 })
  })

  function todayKey() {
    return new Date().toISOString().slice(0, 10)
  }

  function cleanOldCache() {
    const now = Date.now()
    const MS_PER_DAY = 86400000
    try {
      const files = fs.readdirSync(cacheDir)
      for (const f of files) {
        if (!f.endsWith('.json')) continue
        // 文件名格式: YYYY-MM-DD_key.json
        const datePart = f.split('_')[0]
        if (!datePart || datePart.length !== 10) continue
        const fileDate = new Date(datePart).getTime()
        if (isNaN(fileDate)) continue
        if (now - fileDate > 7 * MS_PER_DAY) {
          fs.unlinkSync(path.join(cacheDir, f))
          console.log('[Cache] 删除过期缓存:', f)
        }
      }
    } catch {}
  }

  app.get('/cache/:key', (req, res) => {
    const safeKey = sanitizeKey(req.params.key)
    if (!safeKey) return res.json({ code: 200, data: null })
    const filePath = path.join(cacheDir, `${todayKey()}_${safeKey}.json`)
    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        res.json({ code: 200, data })
      } else {
        res.json({ code: 200, data: null })
      }
    } catch {
      res.json({ code: 200, data: null })
    }
  })

  app.post('/cache/:key', (req, res) => {
    const safeKey = sanitizeKey(req.params.key)
    if (!safeKey) return res.status(400).json({ code: 400, msg: '非法 key' })
    cleanOldCache()
    const filePath = path.join(cacheDir, `${todayKey()}_${safeKey}.json`)
    try {
      fs.writeFileSync(filePath, JSON.stringify(req.body.data), 'utf-8')
      res.json({ code: 200 })
    } catch (e) {
      res.status(500).json({ code: 500, msg: e.message })
    }
  })

  // ── 11. 挂载 NeteaseCloudMusicApi 其余模块，自动注入 session cookie ──
  const moduleDefs = await getModulesDefinitions(path.join(__dirname, 'node_modules', 'NeteaseCloudMusicApi', 'module'))
  const skip = new Set(['login_qr_key', 'login_qr_check', 'login_qr_create', 'login', 'login_cellphone'])
  const filtered = moduleDefs.filter(d => !skip.has(d.identifier))

  for (const def of filtered) {
    app.use(def.route, async (req, res) => {
      // 如果前端传了 cookie 就用前端的，否则用服务器存储的 session cookie
      let frontendCookie = null
      if (req.query?.cookie && typeof req.query.cookie === 'string') {
        frontendCookie = cookieToJson(decode(req.query.cookie))
      } else if (req.body?.cookie && typeof req.body.cookie === 'string') {
        frontendCookie = cookieToJson(decode(req.body.cookie))
      }

      const currentCnIp = global.cnIp || getRandomChinaIP()
      const query = Object.assign({}, req.query, req.body, req.files || {})
      query.cookie = frontendCookie || getSessionCookieObj()
      query.realIP = currentCnIp
      query.ip = currentCnIp

      try {
        const moduleResponse = await def.module(query, (...params) => {
          const obj = [...params]
          const options = obj[3] || {}
          options.ip = currentCnIp
          options.realIP = currentCnIp
          obj[3] = options
          return ncmRequest(...obj)
        })

        console.log('[OK]', decode(req.originalUrl))

        const cookies = moduleResponse.cookie
        if (Array.isArray(cookies) && cookies.length > 0) {
          // 如果响应返回了新的 cookie，更新 session
          const newPairs = []
          for (const c of cookies) {
            const pair = c.split(';')[0].trim()
            const name = pair.split('=')[0]
            if (['MUSIC_U', 'MUSIC_A', 'NMTID', '__csrf'].includes(name)) {
              newPairs.push(pair)
            }
          }
          if (newPairs.length > 0) {
            const existing = getSessionCookieObj()
            for (const p of newPairs) {
              const [k, ...v] = p.split('=')
              existing[k.trim()] = v.join('=').trim()
            }
            saveSessionCookie(Object.entries(existing).map(([k, v]) => `${k}=${v}`).join('; '))
          }
        }

        const body = typeof moduleResponse.body === 'string' ? JSON.parse(moduleResponse.body) : moduleResponse.body
        res.status(moduleResponse.status).json(body)
      } catch (moduleResponse) {
        console.log('[ERR]', decode(req.originalUrl), {
          status: moduleResponse?.status || 500,
          body: moduleResponse?.body || moduleResponse?.message,
        })
        if (!moduleResponse || !moduleResponse.body) {
          res.status(404).send({ code: 404, data: null, msg: 'Not Found' })
          return
        }
        if (moduleResponse.body.code == '301') moduleResponse.body.msg = '需要登录'
        const errBody = typeof moduleResponse.body === 'string' ? JSON.parse(moduleResponse.body) : moduleResponse.body
        res.status(moduleResponse.status || 500).json(errBody)
      }
    })
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('[FreedomMusic Server] 运行在: http://127.0.0.1:3000 和 http://0.0.0.0:3000')
    console.log('[FreedomMusic Server] 伪装国内节点 IP:', global.cnIp)
    console.log('[FreedomMusic Server] Session 状态:', sessionCookie ? '已加载登录 Cookie' : '未登录(已分配匿名Token)')
  })
}

start().catch((err) => {
  console.error('[Server Start Error]', err)
})

