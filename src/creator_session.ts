import { z } from "zod";

export const deliveryRequest = z.object({
  user_id: z.string().min(1),
  asset_id: z.string().min(1),
  subscriber_update: z.string().min(1),
  content_status: z.enum(["queued", "processed"])
});

export type DeliveryRequest = z.infer<typeof deliveryRequest>;

export type SessionState = {
  refreshToken: string;
  revoked: boolean;
};

export function rotateSession(state: SessionState, nextRefreshToken: string): SessionState {
  if (state.revoked) throw new Error("session is revoked");
  return { refreshToken: nextRefreshToken, revoked: false };
}

export function revokeSession(state: SessionState): SessionState {
  return { ...state, revoked: true };
}

export function prepareDelivery(input: unknown): DeliveryRequest {
  return deliveryRequest.parse(input);
}
