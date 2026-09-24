import dotenv from 'dotenv';
dotenv.config();

import { buildApp } from './app.js';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  const app = buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`🚀 PixMatch AI Fastify API running on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
