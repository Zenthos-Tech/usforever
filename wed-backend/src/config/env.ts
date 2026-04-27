import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function envStr(name: string, fallback = ''): string {
  const v = process.env[name];
  return (v == null ? fallback : String(v)).trim();
}

function envInt(name: string, fallback: number): number {
  const v = parseInt(envStr(name, ''), 10);
  return Number.isNaN(v) ? fallback : v;
}

export const env = {
  // Database
  MONGO_URI: envStr('MONGO_URI', 'mongodb://127.0.0.1:27017/usforever'),

  // AWS
  AWS_REGION: envStr('AWS_REGION'),
  AWS_ACCESS_KEY_ID: envStr('AWS_ACCESS_KEY_ID'),
  AWS_SECRET_ACCESS_KEY: envStr('AWS_SECRET_ACCESS_KEY'),
  AWS_BUCKET: envStr('AWS_BUCKET'),
  S3_BUCKET: envStr('S3_BUCKET'),
  S3_PREFIX: envStr('S3_PREFIX', ''),
  S3_DELIMITER: envStr('S3_DELIMITER', '/'),

  // MSG91
  MSG91_AUTH_KEY: envStr('MSG91_AUTH_KEY'),
  MSG91_TEMPLATE_ID: envStr('MSG91_TEMPLATE_ID', '1007939744395319169'),
  MSG91_SENDER_ID: envStr('MSG91_SENDER_ID', 'CSMTCH'),

  // JWT — JWT_SECRET is required and must not be the placeholder value.
  // See assertion in assertSecureConfig() below.
  JWT_SECRET: envStr('JWT_SECRET'),
  JWT_EXPIRES_IN: envStr('JWT_EXPIRES_IN', '30d'),

  // Photographer
  PHOTOGRAPHER_JWT_SECRET: envStr('PHOTOGRAPHER_JWT_SECRET'),
  PHOTOGRAPHER_JWT_EXPIRES_IN: envStr('PHOTOGRAPHER_JWT_EXPIRES_IN', '12h'),
  PHOTOGRAPHER_WEB_APP: envStr('PHOTOGRAPHER_WEB_APP', 'http://localhost:5173'),

  // Guest web experience (website URL guests open when tapping share link)
  GUEST_WEB_URL: envStr('GUEST_WEB_URL', 'http://localhost:5173'),

  // App
  APP_SCHEME: envStr('APP_SCHEME', 'usforever'),
  EXPO_GO_BASE: envStr('EXPO_GO_BASE'),
  PUBLIC_APP_BASE_URL: envStr('PUBLIC_APP_BASE_URL'),
  // Comma-separated list of allowed CORS origins. Empty in development
  // (allows all); must be set in production.
  CORS_ALLOWED_ORIGINS: envStr('CORS_ALLOWED_ORIGINS'),

  // TV
  TV_PAIR_TTL_MINUTES: envInt('TV_PAIR_TTL_MINUTES', 5),
  TV_TOKEN_TTL: envStr('TV_TOKEN_TTL', '12h'),

  // SES
  AWS_VERIFIED_EMAIL: envStr('AWS_VERIFIED_EMAIL'),

  // Server
  PORT: envInt('PORT', 1337),
  HOST: envStr('HOST', '0.0.0.0'),
};

// Fail fast on misconfigured secrets so we can never boot with a forgeable
// token. Throwing here aborts before the HTTP server starts listening.
const PLACEHOLDER_JWT_SECRET = 'change-me-in-production';

export function assertSecureConfig(): void {
  if (!env.JWT_SECRET || env.JWT_SECRET === PLACEHOLDER_JWT_SECRET) {
    throw new Error(
      'JWT_SECRET is missing or set to the placeholder. Set a strong, random ' +
        'JWT_SECRET in the environment before starting the server.'
    );
  }
  if (env.JWT_SECRET.length < 32) {
    throw new Error(
      'JWT_SECRET is too short — use at least 32 characters of entropy.'
    );
  }
}

assertSecureConfig();
