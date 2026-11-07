/**
 * Fail-Closed Integration Environment Guard
 * Ensures integration tests are never silently skipped when environment variables are missing.
 */
const mongoPort = process.env.TEST_MONGO_PORT || "27019";
const redisPort = process.env.TEST_REDIS_PORT || "6381";
const mongoUrl = process.env.TEST_MONGO_URL || `mongodb://127.0.0.1:${mongoPort}/cms_test`;
const redisUrl = process.env.TEST_REDIS_URL || `redis://127.0.0.1:${redisPort}`;

process.env.TEST_MONGO_URL = mongoUrl;
process.env.TEST_REDIS_URL = redisUrl;
