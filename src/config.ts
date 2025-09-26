import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  return {
    database: {
      url: process.env.DATABASE_URL,
    },
    credentials: {
      email: process.env.GAME_EMAIL,
      password: process.env.GAME_PASSWORD,
      timezone_offset: process.env.TIMEZONE_OFFSET,
    },
    redis: {
      url: process.env.REDIS_URL,
    },
  };
});
