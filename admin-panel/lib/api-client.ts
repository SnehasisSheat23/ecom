let rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || "https://ecom-production-7976.up.railway.app"
if (rawBaseUrl && !rawBaseUrl.startsWith("http://") && !rawBaseUrl.startsWith("https://")) {
  rawBaseUrl = `https://${rawBaseUrl}`
}
const RAW_API_BASE_URL = rawBaseUrl
const API_BASE_URL = RAW_API_BASE_URL.endsWith("/api/v1")
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL}/api/v1`

export async function apiRequest(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

  const headers = new Headers(options.headers || {})
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  // Normalize request path so calls like "/admin/products" or "/products" cleanly hit "/products"
  let cleanPath = path
  if (cleanPath.startsWith("/admin/")) {
    cleanPath = cleanPath.replace("/admin/", "/")
  } else if (cleanPath.startsWith("/catalog/")) {
    cleanPath = cleanPath.replace("/catalog/", "/")
  }
  if (!cleanPath.startsWith("/")) {
    cleanPath = `/${cleanPath}`
  }

  const response = await fetch(`${API_BASE_URL}${cleanPath}`, {
    ...options,
    headers,
  })

  return response
}

export async function apiLogout() {
  localStorage.removeItem("user_session")
  localStorage.removeItem("access_token")
  if (typeof window !== "undefined") {
    window.location.href = "/"
  }
}
