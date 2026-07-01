import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "student";

export interface Profile {
  id: string;
  fullname: string;
  email: string | null;
  role: string;
  faculty: string | null;
  major: string | null;
  semester: number | null;
  bio: string | null;
  avatar: string | null;
  total_points: number;
  created_at: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: {
    email: string;
    password: string;
    fullname: string;
    role: AppRole;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadProfileAndRole(userId: string) {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const roleList = (roles ?? []).map((r) => r.role as AppRole);
  const role: AppRole | null = roleList.includes("admin")
    ? "admin"
    : roleList.includes("student")
      ? "student"
      : null;
  return { profile: (profile as Profile) ?? null, role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      if (newSession?.user) {
        // Defer supabase calls to avoid deadlock inside the callback.
        setTimeout(async () => {
          const { profile, role } = await loadProfileAndRole(newSession.user.id);
          if (!active) return;
          setProfile(profile);
          setRole(role);
          setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        const { profile, role } = await loadProfileAndRole(data.session.user.id);
        if (!active) return;
        setProfile(profile);
        setRole(role);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!session?.user) return;
    const { profile, role } = await loadProfileAndRole(session.user.id);
    setProfile(profile);
    setRole(role);
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthContextValue["signUp"] = async ({
    email,
    password,
    fullname,
    role,
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { fullname },
      },
    });
    if (error) return { error: error.message };
    const userId = data.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        fullname,
        email,
        role,
      });
      await supabase.from("user_roles").upsert(
        { user_id: userId, role },
        { onConflict: "user_id,role" },
      );
      await refreshProfile();
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, profile, role, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}