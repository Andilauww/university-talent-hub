import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  GraduationCap,
  Loader2,
  Sparkles,
  Trophy,
  Users,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const { session, role, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullname, setFullname] = useState("");
  const [signupRole, setSignupRole] = useState<AppRole>("student");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session && role) {
      navigate({ to: role === "admin" ? "/admin" : "/app" });
    }
  }, [loading, session, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error);
        } else {
          toast.success("Welcome back!");
        }
      } else {
        if (!fullname.trim()) {
          toast.error("Please enter your full name");
          return;
        }
        const { error } = await signUp({
          email,
          password,
          fullname: fullname.trim(),
          role: signupRole,
        });
        if (error) {
          toast.error(error);
        } else {
          toast.success("Account created! Redirecting…");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left illustration */}
      <div className="relative hidden overflow-hidden bg-gradient-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-3 text-primary-foreground">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/20 backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-lg font-extrabold">University Talent Hub</span>
        </div>

        <div className="relative text-primary-foreground">
          <h1 className="max-w-md text-4xl font-extrabold leading-tight">
            Discover, verify & reward student talent.
          </h1>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            Map skills, verify achievements, gamify growth, and match students to
            the right opportunities — all in one premium platform.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { icon: Users, label: "Talent Mapping" },
              { icon: ShieldCheck, label: "Verified Skills" },
              { icon: Trophy, label: "Gamified Rewards" },
              { icon: Sparkles, label: "Smart Recommendations" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur"
              >
                <f.icon className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-primary-foreground/70">
          Empowering universities to nurture their brightest students.
        </p>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold">University Talent Hub</span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Enter your credentials to access your dashboard."
              : "Join the hub and start showcasing your talent."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="fullname">Full name</Label>
                <Input
                  id="fullname"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  placeholder="Jane Doe"
                  className="h-11 rounded-xl"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-xl"
              />
            </div>



            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-xl bg-gradient-primary text-base font-semibold shadow-soft transition-transform hover:scale-[1.01]"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? "Login" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}