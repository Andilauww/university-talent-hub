import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Brain,
  RefreshCw,
  Briefcase,
  Trophy,
  FolderKanban,
  BookOpen,
  Compass,
  Zap,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard/DashboardShell";
import { getRecommendations } from "@/lib/points";
import { Button } from "@/components/ui/button";
import { getAIRecommendations } from "@/lib/ai-recommendations.server";
import type { AIRecommendation, AIRecommendationResult } from "@/lib/ai-recommendations";

export const Route = createFileRoute("/app/recommendations")({
  component: RecommendationsPage,
});

const TYPE_CONFIG: Record<string, { icon: typeof Briefcase; color: string; bg: string }> = {
  Internship: { icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
  Competition: { icon: Trophy, color: "text-amber-600", bg: "bg-amber-50" },
  Project: { icon: FolderKanban, color: "text-emerald-600", bg: "bg-emerald-50" },
  "Learning Path": { icon: BookOpen, color: "text-purple-600", bg: "bg-purple-50" },
  "Career Path": { icon: Compass, color: "text-rose-600", bg: "bg-rose-50" },
  Challenge: { icon: Zap, color: "text-orange-600", bg: "bg-orange-50" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? { icon: Sparkles, color: "text-primary", bg: "bg-accent" };
}

function RecommendationsPage() {
  const { session, profile } = useAuth();
  const uid = session?.user.id;
  const queryClient = useQueryClient();
  const [aiResult, setAiResult] = useState<AIRecommendationResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fetch user skills for fallback rule-based recommendations
  const { data: skills } = useQuery({
    queryKey: ["rec-skills", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("skills")
        .select("skill_name")
        .eq("user_id", uid!);
      return (data ?? []).map((s) => s.skill_name);
    },
  });

  // Mutation for AI recommendation generation
  const aiMutation = useMutation({
    mutationFn: async () => {
      if (!uid || !profile) throw new Error("Not authenticated or profile not found");
      
      // Fetch skills, certificates, and portfolio
      const [skillsRes, certsRes, portfolioRes] = await Promise.all([
        supabase.from("skills").select("skill_name").eq("user_id", uid).eq("status", "approved"),
        supabase.from("certificates").select("title").eq("user_id", uid).eq("status", "approved"),
        supabase.from("portfolio").select("title").eq("user_id", uid).eq("status", "approved"),
      ]);

      const ctx = {
        fullname: profile.fullname,
        faculty: profile.faculty,
        major: profile.major,
        semester: profile.semester,
        bio: profile.bio,
        totalPoints: profile.total_points ?? 0,
        skills: (skillsRes.data ?? []).map((s) => s.skill_name),
        certificates: (certsRes.data ?? []).map((c) => c.title),
        portfolioTitles: (portfolioRes.data ?? []).map((p) => p.title),
      };

      return getAIRecommendations({ data: { ctx } });
    },
    onSuccess: (data) => {
      setAiResult(data);
      setAiError(null);
    },
    onError: (err: Error) => {
      setAiError(err.message);
    },
  });

  const recs = getRecommendations(skills ?? []);
  const hasSkills = (skills ?? []).length > 0;

  return (
    <div>
      <PageHeader
        title="AI Recommendation"
        subtitle="Rekomendasi personal berbasis AI dari profil, skill, dan pencapaianmu."
      />

      {/* AI Generation Section */}
      <div className="mb-8 rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent/30 p-6 shadow-card">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Gemini AI Advisor</h3>
              <p className="text-sm text-muted-foreground">
                Analisis profilmu dan dapatkan rekomendasi yang dipersonalisasi
              </p>
            </div>
          </div>
          <Button
            onClick={() => aiMutation.mutate()}
            disabled={aiMutation.isPending}
            className="rounded-xl bg-gradient-primary px-6 shadow-soft transition-transform hover:scale-[1.02]"
          >
            {aiMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI sedang menganalisis...
              </>
            ) : aiResult ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate Ulang
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Rekomendasi AI
              </>
            )}
          </Button>
        </div>

        {/* AI Loading Animation */}
        {aiMutation.isPending && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-8">
            <div className="relative">
              <div className="h-16 w-16 animate-pulse rounded-full bg-gradient-primary opacity-20" />
              <Brain className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-pulse text-primary" />
            </div>
            <p className="text-sm font-semibold text-primary">
              Gemini AI sedang menganalisis profilmu...
            </p>
            <p className="text-xs text-muted-foreground">
              Menganalisis skill, sertifikat, dan portfolio untuk rekomendasi terbaik
            </p>
          </div>
        )}

        {/* AI Error */}
        {aiError && !aiMutation.isPending && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Gagal generate rekomendasi</p>
              <p className="mt-1 text-xs text-muted-foreground">{aiError}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Rekomendasi rule-based di bawah masih tersedia sebagai alternatif.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI Results */}
      {aiResult && !aiMutation.isPending && (
        <div className="mb-8 space-y-6">
          {/* AI Summary */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/30 p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-bold text-foreground">Ringkasan AI</p>
                <p className="mt-1 text-sm text-muted-foreground">{aiResult.summary}</p>
              </div>
            </div>
          </div>

          {/* AI Recommendation Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {aiResult.recommendations.map((rec, i) => {
              const config = getTypeConfig(rec.type);
              const Icon = config.icon;
              return (
                <div
                  key={i}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-soft"
                >
                  {/* Type badge */}
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${config.bg} ${config.color}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {rec.type}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="font-bold text-foreground">{rec.title}</h4>

                  {/* Description */}
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {rec.description}
                  </p>

                  {/* Reason */}
                  <div className="mt-3 rounded-lg bg-accent/50 p-3">
                    <p className="text-xs font-medium text-accent-foreground">
                      💡 {rec.reason}
                    </p>
                  </div>

                  {/* Hover indicator */}
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Recommended <ArrowRight className="h-3.5 w-3.5" />
                  </span>

                  {/* Decorative gradient */}
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-primary opacity-0 blur-2xl transition-opacity group-hover:opacity-10" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      {aiResult && recs.length > 0 && (
        <div className="mb-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Rekomendasi Rule-Based
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {/* Fallback Rule-Based Recommendations */}
      {recs.length === 0 && !aiResult ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 font-semibold text-foreground">Belum ada rekomendasi</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tambahkan skill seperti React, Python, atau UI UX, lalu klik "Generate Rekomendasi AI" di atas.
          </p>
        </div>
      ) : (
        !aiResult && (
          <div className="space-y-8">
            {recs.map((rec) => (
              <div key={rec.skill}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full bg-gradient-primary px-3 py-1 text-sm font-bold text-primary-foreground">
                    {rec.skill}
                  </span>
                  <span className="text-sm text-muted-foreground">Because you have this skill</span>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {rec.items.map((item, i) => (
                    <div
                      key={i}
                      className="group rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-soft"
                    >
                      <span className="inline-block rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                        {item.type}
                      </span>
                      <p className="mt-3 font-bold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        Recommended <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}