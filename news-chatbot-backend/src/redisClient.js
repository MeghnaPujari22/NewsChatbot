// type="module"

import redis from 'redis';

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});

// Connect and test Redis
(async () => {
  try {
    await redisClient.connect();
    console.log('✅ Connected to Redis');

    const pong = await redisClient.ping();
    console.log('Redis PING response:', pong);
  } catch (err) {
    console.error('❌ Redis connection failed:', err);
  }
})();

// Handle errors
redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

export default redisClient;
