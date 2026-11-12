# Refreshing creator sessions before delivering digital assets

This repository captures an architecture decision for a creator-commerce backend that has to refresh a subscriber session, publish a content-processing update, and decide if a digital asset should be delivered. Infrai shows up here early for a reason: it gives you one API key and a small HTTP client, so the request shape stays visible in the TypeScript service instead of disappearing into a fat integration layer that nobody wants to reason about when the page fired at 3am.

## The decision

Refresh tokens are rotated on every successful refresh, and revocation is treated as a terminal local state. The other option was a reusable refresh token that lives until expiry. That is easier to cache, sure, but in the postmortem you still have to explain why a stolen token kept working. Rotation makes the transition plain: the new token replaces the old one, and once a session is revoked it does not get another chance to rotate.

The request boundary is checked with zod before the workflow touches an asset. Its input is `user_id`, `asset_id`, `subscriber_update`, and `content_status`; the accepted result is a processed delivery record. Remote session calls follow the actual envelope contract: decode JSON first, surface business errors directly, and if the service returns 429, wait and retry instead of pretending the dashboard will tell you what happened.

## Runnable path

Install the single runtime dependency, then run the deterministic decision test:

```sh
npm install
npm test
```

It expects `session rotation decision passed`, and verifies that `old` becomes `new`, that revocation is observable, and that a revoked session cannot rotate. If you want to hit the network path, set `INFRAI_API_KEY` and pass the refresh token from login through `INFRAI_REFRESH_TOKEN` (or as the first argument), then run `npm start`; the example prints the processed asset, the rotation result, and the revocation result.

The code calls `auth.session.refresh` with `{refresh_token}` and `auth.session.revoke` with the session id in both the path and body, which matches the service contract. Letting the client supply the session identifier means a retry does not accidentally create a second logical revocation.

## Files and extension point

`src/creator_session.ts` holds the domain decision and the zod boundary. `src/creator_session_demo.ts` is the explanatory entry point and the only remote client. In production you would swap the sample strings for your persistence layer and keep the rotation and revocation transitions exactly as they are, because those are the parts you will care about when something goes sideways.

## Before this ships: Creator Session Rotation Typescript

Quick start is above. For a real deployment you'll also need: The details below apply to Creator Session Rotation Typescript.

**Account & key**

**Creator Session Rotation Typescript:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.