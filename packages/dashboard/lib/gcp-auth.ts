import { auth, clerkClient } from "@clerk/nextjs/server";
import { SignJWT, importPKCS8 } from "jose";

/**
 * Get the current user's Google OAuth access token and Convex JWT from Clerk.
 * Clerk auto-refreshes expired tokens using the stored refresh token.
 */
export async function getGcpToken(): Promise<{
  userId: string;
  gcpToken: string;
  convexToken: string | null;
} | null> {
  const { userId, getToken } = await auth();
  if (!userId) return null;

  try {
    const client = await clerkClient();
    const response = await client.users.getUserOauthAccessToken(
      userId,
      "google"
    );

    if (!response.data || response.data.length === 0) {
      return null;
    }

    // Also get the Convex JWT for server-side mutations
    let convexToken: string | null = null;
    try {
      convexToken = await getToken({ template: "convex" });
    } catch {
      // Convex JWT template may not exist
    }

    return { userId, gcpToken: response.data[0].token, convexToken };
  } catch (err) {
    console.error("Failed to get Google OAuth token:", err);
    return null;
  }
}

/**
 * Get a GCP access token using the managed service account key.
 * Used for "DynoClaw Managed" deployments where we own the infra.
 */
export async function getManagedGcpToken(): Promise<string | null> {
  const keyJson = process.env.GCP_MANAGED_SA_KEY;
  if (!keyJson) return null;

  try {
    // Key is stored as base64 in Vercel to avoid newline escaping issues
    const decoded = Buffer.from(keyJson, "base64").toString("utf-8");
    const key = JSON.parse(decoded);
    const privateKey = await importPKCS8(key.private_key, "RS256");

    const now = Math.floor(Date.now() / 1000);
    const jwt = await new SignJWT({
      scope: "https://www.googleapis.com/auth/cloud-platform",
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(key.client_email)
      .setSubject(key.client_email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey);

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!res.ok) {
      console.error("Failed to get managed SA token:", await res.text());
      return null;
    }

    const data = await res.json();
    return data.access_token;
  } catch (err) {
    console.error("Failed to get managed GCP token:", err);
    return null;
  }
}

/**
 * Get the right GCP token for a project — managed SA for dynoclaw-managed,
 * user's OAuth for self-hosted. Also returns the Convex JWT.
 */
export async function getGcpTokenForProject(project: string): Promise<{
  gcpToken: string;
  convexToken: string | null;
} | null> {
  if (project === "dynoclaw-managed") {
    const gcpToken = await getManagedGcpToken();
    if (!gcpToken) return null;

    // Get Convex token from Clerk (no Google OAuth needed)
    let convexToken: string | null = null;
    try {
      const { getToken } = await auth();
      convexToken = await getToken({ template: "convex" });
    } catch {}

    return { gcpToken, convexToken };
  }

  return await getGcpToken();
}
