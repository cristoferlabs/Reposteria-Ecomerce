// Flujo OAuth 2.0 de Google implementado a mano con fetch nativo (sin
// librerías de terceros: arctic está descontinuado por su autor).
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export function buildGoogleAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: import.meta.env.GOOGLE_CLIENT_ID,
    redirect_uri: import.meta.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

export async function exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
  const params = new URLSearchParams({
    client_id: import.meta.env.GOOGLE_CLIENT_ID,
    client_secret: import.meta.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: import.meta.env.GOOGLE_REDIRECT_URI,
    code,
    grant_type: "authorization_code",
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!response.ok) {
    throw new Error(`Google token exchange falló: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Google userinfo falló: ${response.status} ${await response.text()}`);
  }
  return response.json();
}
