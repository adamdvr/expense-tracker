import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'
import type { NextConfig } from 'next'

export default function nextConfig(phase: string): NextConfig {
  return {
    // next dev и next build пишут в разные папки: иначе build перезаписывает .next
    // работающего dev-сервера и тот отдаёт 500/404 на чанках. В Next.js 16 так по умолчанию
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    reactStrictMode: true,
    env: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    },
  }
}
