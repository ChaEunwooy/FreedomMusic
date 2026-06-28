import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
})

let cache: Record<string, unknown> = {}

// 同步获取配置（用于 main.tsx 初始化）
export function loadConfigSync(): Record<string, unknown> {
  try {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', '/api/config', false)
    xhr.send()
    if (xhr.status === 200) {
      const result = JSON.parse(xhr.responseText)
      cache = result.data || {}
      return cache
    }
  } catch { /* ignore */ }
  return {}
}

export async function loadConfig() {
  try {
    const res = await api.get('/config')
    cache = res.data.data || {}
    return res.data
  } catch {
    return { data: {}, dir: '', size: 0, limit: 0 }
  }
}

export function getConfig(key: string, defaultValue?: unknown) {
  return cache[key] !== undefined ? cache[key] : defaultValue
}

export async function setConfig(key: string, value: unknown) {
  cache[key] = value
  try {
    await api.post(`/config/${key}`, { value })
  } catch { /* ignore */ }
}

export async function removeConfig(key: string) {
  delete cache[key]
  try {
    await api.delete(`/config/${key}`)
  } catch { /* ignore */ }
}
