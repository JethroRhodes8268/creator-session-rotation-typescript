import assert from "node:assert/strict";
import { prepareDelivery, revokeSession, rotateSession } from "./creator_session.ts";

const input = {
  user_id: "subscriber-1",
  asset_id: "asset-9",
  subscriber_update: "ready",
  content_status: "processed" as const
};
const parsed = prepareDelivery(input);
assert.equal(parsed.asset_id, "asset-9");

const rotated = rotateSession({ refreshToken: "old", revoked: false }, "new");
assert.equal(rotated.refreshToken, "new");
assert.equal(revokeSession(rotated).revoked, true);
assert.throws(() => rotateSession({ refreshToken: "old", revoked: true }, "new"), /revoked/);
console.log("session rotation decision passed");
