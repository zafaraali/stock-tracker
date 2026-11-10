import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/market-quote': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/market-quote/, '/v8/finance/chart')
      },
      '/api/market-search': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        headers: { 'User-Agent': 'Mozilla/5.0 ApexFinance/1.0', accept: 'application/json' },
        rewrite: path => path.replace(/^\/api\/market-search/, '/v1/finance/search')
      },
      '/api/fx-rates': {
        target: 'https://api.frankfurter.dev',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/fx-rates/, '/v2/rates')
      }
    }
  }
})
