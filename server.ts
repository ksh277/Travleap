/**
 * Custom Next.js Server with WebSocket Support
 *
 * Usage:
 * 1. npm install socket.io
 * 2. Update package.json scripts:
 *    "dev": "ts-node --project tsconfig.server.json server.ts"
 *    "build": "next build"
 *    "start": "NODE_ENV=production ts-node --project tsconfig.server.json server.ts"
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { wsServer } from './utils/websocket-server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // WebSocket 서버 연결
  wsServer.attach(server);

  // 서버 통계 출력 (10초마다)
  setInterval(() => {
    const stats = wsServer.getStats();
    console.log('[WebSocket Stats]', stats);
  }, 10000);

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> WebSocket ready on ws://${hostname}:${port}`);
    });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    wsServer.close();
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    wsServer.close();
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});
