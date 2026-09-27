"use client";

import { createAuthClient } from "better-auth/react";

const getBaseUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  // Strip trailing /api/v1 if present so baseURL is just the origin / host
  return url.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
};

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  basePath: "/api/v1/auth",
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;

// Better-auth client exposes requestPasswordReset and resetPassword
export const requestPasswordReset = (data: { email: string; redirectTo?: string }) =>
  (authClient as any).requestPasswordReset(data);

export const resetPassword = (data: { newPassword: string; token?: string }) =>
  (authClient as any).resetPassword(data);

