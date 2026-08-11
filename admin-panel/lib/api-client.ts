const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"

export async function apiRequest(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

  const headers = new Headers(options.headers || {})
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }
  if (!headers.has("X-Tenant-Id") && !headers.has("x-tenant-id")) {
    headers.set("X-Tenant-Id", process.env.NEXT_PUBLIC_TENANT_ID || "abdullah-bakheet")
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  })

  // Handle Token Expiry & Automatic Refresh
  if (
    response.status === 401 &&
    path !== "/auth/login" &&
    path !== "/auth/register" &&
    path !== "/auth/refresh"
  ) {
    const refreshSuccess = await attemptTokenRefresh()
    if (refreshSuccess) {
      const newToken = localStorage.getItem("access_token")
      const retryHeaders = new Headers(options.headers || {})
      if (!retryHeaders.has("Content-Type") && !(options.body instanceof FormData)) {
        retryHeaders.set("Content-Type", "application/json")
      }
      if (newToken) {
        retryHeaders.set("Authorization", `Bearer ${newToken}`)
      }
      return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: retryHeaders,
        credentials: "include",
      })
    } else {
      console.warn("API 401 Unauthorized for path:", path)
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token")
        localStorage.removeItem("user_session")
        window.location.href = "/"
      }
      return response
    }
  }

  return response
}

async function attemptTokenRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    if (res.ok) {
      const body = await res.json()
      if (body.data?.accessToken) {
        localStorage.setItem("access_token", body.data.accessToken)
        return true
      }
    }
  } catch (e) {
    console.error("Token refresh failed:", e)
  }
  return false
}

export async function apiLogout() {
  try {
    await apiRequest("/auth/logout", { method: "POST" })
  } catch (e) {
    console.error("Logout request failed:", e)
  } finally {
    localStorage.removeItem("user_session")
    localStorage.removeItem("access_token")
    if (typeof window !== "undefined") {
      window.location.href = "/"
    }
  }
}
