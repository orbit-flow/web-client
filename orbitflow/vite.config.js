import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // 개발 서버가 /api·/oauth2를 넘길 백엔드. 로컬 서버에 붙을 땐 .env.local에 API_PROXY_TARGET=http://localhost:8080
  const target = loadEnv(mode, import.meta.dirname, '').API_PROXY_TARGET || 'https://orbitflow.me'
  const backend = {
    target,
    changeOrigin: true,
    // 서버 CORS는 app.front-url 하나만 허용하므로 localhost 출처를 백엔드 도메인으로 바꿔 보낸다
    headers: { origin: target },
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': backend,
        '/oauth2': backend,
        // 채팅 실시간(STOMP over WebSocket)
        '/ws': { ...backend, ws: true },
      },
    },
  }
})
