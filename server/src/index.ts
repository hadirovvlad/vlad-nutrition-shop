import { createApp } from './app';
import { env } from './env';
import { SHOP_NAME } from './lib/constants';
import { prisma } from './prisma';

async function main() {
  // Fail fast with a clear message if the database has not been set up yet.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error('\n✗ Не вдалося підключитися до бази даних.');
    console.error('  Запустіть: npm run db:reset (у папці server)\n');
    throw error;
  }

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`\n  ${SHOP_NAME} API → http://localhost:${env.port}/api  (${env.nodeEnv})`);
    const cors = env.corsOrigins;
    console.log(`  CORS origin → ${cors.length ? cors.join(', ') : 'same-origin only'}\n`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down…`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
