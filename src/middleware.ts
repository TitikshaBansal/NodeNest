import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/workflow(.*)",
  "/api/workflows(.*)",
  "/api/gemini(.*)",
  "/api/upload(.*)",
]);

const isPublicRoute = createRouteMatcher([
  "/api/webhooks/clerk(.*)", // Clerk webhooks must be public
  "/", // Home page
  "/login(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Skip authentication for public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
  
  // Protect other routes
  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      // Redirect to sign-in if not authenticated
      const signInUrl = new URL("/login", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

