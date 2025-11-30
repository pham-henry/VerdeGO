export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'change-me-dev-secret-at-least-256-bits',
  accessExpirationMinutes: parseInt(
    process.env.JWT_ACCESS_EXP_MIN || '30',
    10
  ),
  refreshExpirationDays: parseInt(
    process.env.JWT_REFRESH_EXP_DAYS || '7',
    10
  ),
};

if (jwtConfig.secret.length < 32) {
  throw new Error(
    'JWT_SECRET must be at least 32 characters long for security'
  );
}


