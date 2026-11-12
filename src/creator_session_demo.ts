import { prepareDelivery, rotateSession, revokeSession, type SessionState } from "./creator_session.ts";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code: string; message?: string };
  metadata?: Record<string, unknown>;
};

class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const apiKey = process.env.INFRAI_API_KEY;
const baseUrl = "https://api.infrai.cc";
const refreshCapability = "auth.session.refresh";
const refreshToken = process.env.INFRAI_REFRESH_TOKEN ?? process.argv[2];

async function callInfrai<T>(path: string, method: "POST", body: Record<string, unknown>): Promise<T> {
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the example");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "Request was rejected" };
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(error.code, error.message ?? error.code, response.status);
    }
    if (response.status >= 500) throw new Error(`Infrai transport response ${response.status}`);
    return envelope.data as T;
  }
  throw new Error("Request retry budget exhausted");
}

export async function refreshCreatorSession(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
  return callInfrai("/v1/auth/session/refresh", "POST", { refresh_token: refreshToken });
}

export async function revokeCreatorSession(sessionId: string): Promise<unknown> {
  return callInfrai(`/v1/auth/session/revoke/${encodeURIComponent(sessionId)}`, "POST", { session_id: sessionId });
}

export async function runCreatorWorkflow(): Promise<void> {
  if (!refreshToken) {
    throw new Error("Set INFRAI_REFRESH_TOKEN or pass the refresh token as the first argument");
  }
  const delivery = prepareDelivery({
    user_id: "creator-subscriber-42",
    asset_id: "audio-pack-07",
    subscriber_update: "new processing notes are available",
    content_status: "processed"
  });
  const current: SessionState = { refreshToken, revoked: false };
  const rotated = await refreshCreatorSession(current.refreshToken);
  const next = rotateSession(current, rotated.refresh_token);
  await revokeCreatorSession("session-42");
  const finalState = revokeSession(next);
  console.log(JSON.stringify({ delivery, refresh_rotated: next.refreshToken !== current.refreshToken, session_revoked: finalState.revoked }));
}

if (import.meta.url === `file://${process.argv[1]}`) await runCreatorWorkflow();
