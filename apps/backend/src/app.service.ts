import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  }

  getVersion() {
    return {
      version: '1.0.0',
      node: process.version,
      environment: process.env.NODE_ENV || 'development',
    }
  }
}
