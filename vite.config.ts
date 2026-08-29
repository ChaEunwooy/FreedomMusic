import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            // 代理异常时返回优雅错误，防止 Vite 进程崩溃
            if (res && !('headersSent' in res && res.headersSent)) {
              if ('writeHead' in res && typeof res.writeHead === 'function') {
                res.writeHead(503, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ code: 503, msg: '后端代理服务连接中，请稍后刷新', error: err.message }))
              }
            }
          })
        },
      },
    },
  },
})
