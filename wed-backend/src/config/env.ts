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

  // JWT
  JWT_SECRET: envStr('JWT_SECRET', 'change-me-in-production'),
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

  // TV
  TV_PAIR_TTL_MINUTES: envInt('TV_PAIR_TTL_MINUTES', 5),
  TV_TOKEN_TTL: envStr('TV_TOKEN_TTL', '12h'),

  // SES
  AWS_VERIFIED_EMAIL: envStr('AWS_VERIFIED_EMAIL'),

  // Server
  PORT: envInt('PORT', 1337),
  HOST: envStr('HOST', '0.0.0.0'),
};
