/**
 * JWT verification for tunnel-broker.
 *
 * Verifies HS256 JWTs minted by the DynoClaw dashboard at
 * packages/dashboard/app/api/gcp/tunnel-token/route.ts.
 *
 * Expected claims:
 *   - iss: "dynoclaw-dashboard"
 *   - aud: "dynoclaw-tunnel-broker"
 *   - exp: <within 5 min of iat>
 *   - deploymentId: string (Convex id)
 *   - gcpProjectId: string
 *   - gcpZone: string
 *   - vmName: string
 */

import { jwtVerify } from "jose";

export interface TunnelJwtClaims {
  deploymentId: string;
  gcpProjectId: string;
  gcpZone: string;
  vmName: string;
  iat: number;
  exp: number;
}

export async function verifyTunnelJwt(
  token: string,
  secret: string,
): Promise<TunnelJwtClaims> {
  const encoder = new TextEncoder();
  const { payload } = await jwtVerify(token, encoder.encode(secret), {
    issuer: "dynoclaw-dashboard",
    audience: "dynoclaw-tunnel-broker",
    algorithms: ["HS256"],
  });

  const deploymentId = payload.deploymentId;
  const gcpProjectId = payload.gcpProjectId;
  const gcpZone = payload.gcpZone;
  const vmName = payload.vmName;

  if (
    typeof deploymentId !== "string" ||
    typeof gcpProjectId !== "string" ||
    typeof gcpZone !== "string" ||
    typeof vmName !== "string"
  ) {
    throw new Error("Invalid tunnel JWT: missing required claims");
  }

  // Enforce the managed-only invariant at the broker level too (defense in depth)
  if (gcpProjectId !== "dynoclaw-managed") {
    throw new Error(
      "Invalid tunnel JWT: broker only supports dynoclaw-managed deploys",
    );
  }

  return {
    deploymentId,
    gcpProjectId,
    gcpZone,
    vmName,
    iat: typeof payload.iat === "number" ? payload.iat : 0,
    exp: typeof payload.exp === "number" ? payload.exp : 0,
  };
}
