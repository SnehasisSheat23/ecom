"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icon } from "@/components/ui/icon"
import { apiRequest } from "@/lib/api-client"

// Seed initial default accounts
const DEFAULT_ACCOUNTS = [
  {
    email: "admin@example.com",
    password: "password",
    name: "Admin User",
  },
  {
    email: "beta-vendor@trugift.in",
    password: "password123",
    name: "Beta Vendor",
  },
]

type Mode = "login" | "register"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = React.useState<Mode>("login")
  const [loading, setLoading] = React.useState(false)
  const [isRedirecting, setIsRedirecting] = React.useState(true)

  // Form states
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")

  // Check if already authenticated
  React.useEffect(() => {
    const session = localStorage.getItem("user_session")
    if (session) {
      router.push("/dashboard")
    } else {
      // Defer the state update to prevent synchronous cascading renders inside the hook
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
      if (mode === "login") {
        const res = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        })

        const data = await res.json()

        if (res.ok && data.data) {
          const { customer, accessToken } = data.data
          const displayName =
            `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
            customer.email.split("@")[0]

          localStorage.setItem("access_token", accessToken)
          localStorage.setItem(
            "user_session",
            JSON.stringify({
              email: customer.email,
              name: displayName,
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                displayName
              )}`,
            })
          )
          toast.success(`Welcome back, ${displayName}!`)
          router.push("/dashboard")
        } else {
          toast.error(data.error || "Invalid email or password")
          setLoading(false)
        }
      } else {
        if (password.length < 8) {
          toast.error("Password must be at least 8 characters long")
          setLoading(false)
          return
        }

        const res = await apiRequest("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
          }),
        })

        const data = await res.json()

        if (res.ok && data.data) {
          const { customer, accessToken } = data.data
          const displayName =
            `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
            customer.email.split("@")[0]

          localStorage.setItem("access_token", accessToken)
          localStorage.setItem(
            "user_session",
            JSON.stringify({
              email: customer.email,
              name: displayName,
              avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                displayName
              )}`,
            })
          )
          toast.success("Account created successfully!")
          router.push("/dashboard")
        } else {
          toast.error(data.error || "Registration failed")
          setLoading(false)
        }
      }
    } catch (err) {
      console.error("Authentication request failed:", err)
      toast.error("Failed to connect to authentication server")
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
      <div className="relative flex flex-col justify-center px-8 py-12 md:px-16 lg:px-24">
        {/* Branding header in the top left */}
        <div className="absolute top-8 left-8 flex items-center gap-2 font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-black text-white dark:bg-white dark:text-black">
            <Icon name="terminal" className="size-4 text-[16px]!" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 font-ui">
            Acme Inc.
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-[350px] flex-col gap-6">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 font-ui">
              {mode === "login" ? "Login to your account" : "Create a new account"}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {mode === "login"
                ? "Enter your email below to login to your account"
                : "Enter your details below to create your account"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Dynamic Name Input in Register Mode */}
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="firstName" className="text-zinc-800 dark:text-zinc-200">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading}
                    className="h-9 px-3 rounded-md border-zinc-200/80 dark:border-zinc-800"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="lastName" className="text-zinc-800 dark:text-zinc-200">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading}
                    className="h-9 px-3 rounded-md border-zinc-200/80 dark:border-zinc-800"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-zinc-800 dark:text-zinc-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-9 px-3 rounded-md border-zinc-200/80 dark:border-zinc-800"
              />
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-800 dark:text-zinc-200">
                  Password
                </Label>
                {mode === "login" && (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      toast.info("Password recovery is not configured yet.")
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:underline transition-colors font-medium"
                  >
                    Forgot your password?
                  </a>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder={mode === "login" ? "••••••••" : "At least 8 characters"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-9 px-3 rounded-md border-zinc-200/80 dark:border-zinc-800"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 h-9 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 cursor-pointer font-medium rounded-md"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>{mode === "login" ? "Logging in..." : "Creating Account..."}</span>
                </div>
              ) : mode === "login" ? (
                "Login"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
            <span className="flex-shrink mx-4 text-xs uppercase text-zinc-400 dark:text-zinc-600 font-normal">
              Or continue with
            </span>
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
          </div>

          <Button
            variant="outline"
            type="button"
            onClick={() => toast.info("GitHub OAuth login is not configured yet.")}
            className="h-9 w-full flex items-center justify-center gap-2 font-medium cursor-pointer border-zinc-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-md"
          >
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Login with GitHub
          </Button>

          <p className="text-sm text-center text-zinc-500 dark:text-zinc-400 mt-2">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login")
                setEmail("")
                setPassword("")
                setFirstName("")
                setLastName("")
              }}
              className="font-medium text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300 cursor-pointer"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      {/* Right Column: Abstract Design Graphic */}
      <div className="hidden lg:flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 relative border-l border-zinc-200/50 dark:border-zinc-800/50">
        <svg
          className="w-[450px] h-[450px] text-zinc-200/80 dark:text-zinc-800/50 animate-in fade-in zoom-in duration-500"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
        >
          {/* Nested concentric circles */}
          <circle cx="100" cy="100" r="15" />
          <circle cx="100" cy="100" r="35" />
          <circle cx="100" cy="100" r="55" strokeDasharray="3 3" />
          <circle cx="100" cy="100" r="75" />

          {/* Radiating spoke lines */}
          <line x1="100" y1="20" x2="100" y2="180" />
          <line x1="20" y1="100" x2="180" y2="100" />
          <line x1="43.43" y1="43.43" x2="156.57" y2="156.57" />
          <line x1="43.43" y1="156.57" x2="156.57" y2="43.43" />

          {/* Inner circle background container for the image icon */}
          <circle
            cx="100"
            cy="100"
            r="16"
            fill="white"
            className="dark:fill-zinc-950"
            stroke="currentColor"
            strokeWidth="0.75"
          />

          {/* Clean image placeholder symbol in the center */}
          <g
            transform="translate(93, 93)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-400 dark:text-zinc-500"
          >
            {/* Outline of image rectangle */}
            <rect x="0" y="0" width="14" height="14" rx="2" stroke="currentColor" fill="none" />
            {/* Image peaks/mountains */}
            <path d="M1 11l3.5-3.5a1 1 0 0 1 1.4 0L9 11m-1.5-1.5l2-2a1 1 0 0 1 1.4 0L13 10.5" stroke="currentColor" fill="none" />
            {/* Image sun */}
            <circle cx="4.5" cy="4.5" r="1" fill="currentColor" stroke="none" />
          </g>
        </svg>
      </div>
    </div>
  )
}
