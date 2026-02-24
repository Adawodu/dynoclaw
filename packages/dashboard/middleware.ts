import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

const isPublicRoute = createRouteMatcher([
  "/",
  "/guide(.*)",
  "/api/billing/webhook",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const isDashboardRoute = createRouteMatcher([
  "/overview(.*)",
  "/deploy(.*)",
  "/costs(.*)",
  "/media(.*)",
  "/knowledge(.*)",
  "/plugins(.*)",
  "/skills(.*)",
  "/api-keys(.*)",
  "/logs(.*)",
  "/settings(.*)",
  "/billing(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Public routes — no auth needed
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // API routes (except webhook) need auth but not subscription check
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Dashboard routes — require auth + active subscription/trial
  if (isDashboardRoute(req)) {
    const { userId, getToken } = await auth.protect();

    try {
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
      const convexToken = await getToken({ template: "convex" });
      if (convexToken) convex.setAuth(convexToken);

      const sub = await convex.query(api.subscriptions.getByUserId, {});

      // If user has no subscription at all, auto-create a trial via the API
      // route (which creates a Stripe customer + Convex trial record), then
      // let them through.
      if (!sub) {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
        try {
          await fetch(`${appUrl}/api/billing/ensure-trial`, {
            method: "POST",
            headers: {
              cookie: req.headers.get("cookie") || "",
            },
          });
        } catch {
          // If ensure-trial fails (e.g. no Stripe key yet), fail open
        }
        return NextResponse.next();
      }

      const activeStatuses = ["trialing", "active"];
      if (activeStatuses.includes(sub.status)) {
        return NextResponse.next();
      }

      // Subscription exists but is canceled/past_due — redirect to pricing
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.hash = "pricing";
      return NextResponse.redirect(url);
    } catch (err) {
      // Fail open — don't lock users out on Convex errors
      console.error("Middleware subscription check failed:", err);
      return NextResponse.next();
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
