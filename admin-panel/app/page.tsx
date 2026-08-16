"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiRequest } from "@/lib/api-client"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [isRedirecting, setIsRedirecting] = React.useState(true)

  // Form states
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  // Check if already authenticated
  React.useEffect(() => {
    const session = localStorage.getItem("user_session")
    const token = localStorage.getItem("access_token")
    if (session && token) {
      router.push("/dashboard/products")
    } else {
      setTimeout(() => {
        setIsRedirecting(false)
      }, 0)
    }
  }, [router])

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password) {
      toast.error("Please fill in all required fields")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address")
      return
    }

    setLoading(true)

    try {
      const res = await apiRequest("/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok && data.data) {
        const { user, accessToken } = data.data
        const displayName =
          user.name ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          user.email.split("@")[0]

        localStorage.setItem("access_token", accessToken)
        localStorage.setItem(
          "user_session",
          JSON.stringify({
            id: user.id,
            email: user.email,
            name: displayName,
            role: user.role || "admin",
            isAdmin: true,
          })
        )
        toast.success(`Welcome back, ${displayName}!`)
        router.push("/dashboard/products")
        return
      } else {
        toast.error(data.error || "Invalid email or password")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to connect to authentication server")
    } finally {
      setLoading(false)
    }
  }

  if (isRedirecting) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-transparent dark:border-zinc-200" />
      </div>
    )
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-white dark:bg-zinc-950 font-sans">
      {/* Left Column: Form */}
      <div className="relative flex flex-col justify-between px-8 py-10 md:px-16 lg:px-20">
        {/* Branding header in the top left */}
        <div className="flex items-center gap-3">
          <img
            src="/image.png"
            alt="Abdullah Bakheet"
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* Center Login Form */}
        <div className="mx-auto flex w-full max-w-[360px] flex-col gap-6 my-auto py-12">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 font-ui">
              Admin Portal
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Sign in with your administrative credentials to manage products, orders, and quotations.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-zinc-800 dark:text-zinc-200 text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-10 px-3.5 rounded-lg border-zinc-200 dark:border-zinc-800 focus-visible:ring-zinc-950"
              />
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-800 dark:text-zinc-200 text-sm font-medium">
                  Password
                </Label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    toast.info("Please contact system administrator to reset your credentials.")
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:underline transition-colors font-medium"
                >
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-10 px-3.5 rounded-lg border-zinc-200 dark:border-zinc-800 focus-visible:ring-zinc-950"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 h-10 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 cursor-pointer font-medium rounded-lg shadow-sm transition-all"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-xs text-zinc-400 dark:text-zinc-600 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Abdullah Bakheet</span>
          <span>Enterprise Management</span>
        </div>
      </div>

      {/* Right Column: Hero Graphic Image */}
      <div className="hidden lg:relative lg:flex items-end justify-start p-12 overflow-hidden bg-zinc-950">
        <Image
          src="/images/riyadh_hero_3.png"
          alt="Abdullah Bakheet Riyadh Operations"
          fill
          priority
          className="object-cover object-center opacity-85"
        />
        {/* Modern dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

        {/* Hero Content Card */}
        <div className="relative z-10 max-w-lg text-white space-y-3">
          <div className="inline-flex items-center gap-2  text-xs">
            <span className="font-medium tracking-wide">Abdullah Bakheet Co.</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-ui uppercase leading-tight">
            BEST TRADING COMPANY IN SAUDI ARABIA, RIYADH
          </h2>
          <p className="text-sm text-zinc-200 leading-relaxed font-normal">
            Established in 2004, we have built a strong reputation for providing food essentials to restaurants, hotels, caterers, and wholesalers across the Kingdom. With over two decades of industry expertise, we have cultivated long-term relationships with top international brands.
          </p>
        </div>
      </div>
    </div>
  )
}

