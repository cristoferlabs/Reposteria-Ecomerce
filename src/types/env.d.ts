/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL: string;

  readonly TURSO_DATABASE_URL: string;
  readonly TURSO_AUTH_TOKEN: string | undefined;

  readonly MP_ACCESS_TOKEN: string;
  readonly MP_PUBLIC_KEY: string;
  readonly MP_WEBHOOK_SECRET: string;

  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;
  readonly GOOGLE_REDIRECT_URI: string;

  readonly SESSION_SECRET: string;
  readonly ADMIN_EMAILS: string;

  readonly WHATSAPP_BUSINESS_NUMBER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
