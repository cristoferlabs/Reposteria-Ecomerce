import type { APIRoute } from "astro";
import {
  exchangeCodeForToken,
  fetchGoogleUserInfo,
  setSessionCookie,
  upsertGoogleUser,
} from "@/lib/auth";

const STATE_COOKIE = "oauth_state";
const REDIRECT_COOKIE = "oauth_redirect";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = cookies.get(STATE_COOKIE)?.value;
  const redirectTarget = cookies.get(REDIRECT_COOKIE)?.value ?? "/";

  cookies.delete(STATE_COOKIE, { path: "/" });
  cookies.delete(REDIRECT_COOKIE, { path: "/" });

  if (url.searchParams.get("error")) {
    return redirect("/?login_error=denied", 302);
  }
  if (!code || !state || !savedState || state !== savedState) {
    return redirect("/?login_error=state", 302);
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    const profile = await fetchGoogleUserInfo(tokens.access_token);

    if (!profile.email_verified) {
      return redirect("/?login_error=email_no_verificado", 302);
    }

    const user = await upsertGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture ?? null,
    });

    setSessionCookie(cookies, {
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    });

    return redirect(redirectTarget, 302);
  } catch (error) {
    console.error("Google OAuth callback falló:", error);
    return redirect("/?login_error=google", 302);
  }
};
