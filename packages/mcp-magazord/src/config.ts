export interface MagazordConfig {
  baseUrl: string;
  authBasic: string;
  storeUrl: string;
}

export function configFromEnv(): MagazordConfig {
  const baseUrl = process.env.MAGAZORD_BASE_URL;
  const authBasic = process.env.MAGAZORD_AUTH_BASIC;
  if (!baseUrl) throw new Error('MAGAZORD_BASE_URL is required');
  if (!authBasic) throw new Error('MAGAZORD_AUTH_BASIC is required');
  return {
    baseUrl,
    authBasic,
    storeUrl: 'https://www.chinelarialeilaneneves.com.br',
  };
}
