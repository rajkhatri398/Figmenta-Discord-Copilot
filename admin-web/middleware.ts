import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Middleware disabled - auth is handled client-side in dashboard
  // The deprecated middleware was checking for cookies but app uses localStorage
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
