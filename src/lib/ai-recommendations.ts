// Server-side only — Gemini AI recommendation engine.
// This file must only be imported in server contexts (.server.ts, server functions, API routes).

export interface AIRecommendation {
  title: string;
  type: "Internship" | "Competition" | "Project" | "Learning Path" | "Career Path" | "Challenge";
  description: string;
  reason: string;
}

export interface AIRecommendationResult {
  recommendations: AIRecommendation[];
  summary: string;
}

export interface StudentContext {
  fullname: string;
  faculty: string | null;
  major: string | null;
  semester: number | null;
  bio: string | null;
  totalPoints: number;
  skills: string[];
  certificates: string[];
  portfolioTitles: string[];
}

function buildPrompt(ctx: StudentContext): string {
  const skillsList = ctx.skills.length > 0 ? ctx.skills.join(", ") : "belum ada";
  const certsList = ctx.certificates.length > 0 ? ctx.certificates.join(", ") : "belum ada";
  const portfolioList = ctx.portfolioTitles.length > 0 ? ctx.portfolioTitles.join(", ") : "belum ada";

  return `Kamu adalah AI Career Advisor untuk mahasiswa universitas. Berdasarkan profil mahasiswa berikut, berikan rekomendasi yang personal dan actionable.

PROFIL MAHASISWA:
- Nama: ${ctx.fullname}
- Fakultas: ${ctx.faculty ?? "belum diisi"}
- Jurusan: ${ctx.major ?? "belum diisi"}
- Semester: ${ctx.semester ?? "belum diisi"}
- Bio: ${ctx.bio ?? "belum diisi"}
- Total Poin: ${ctx.totalPoints}
- Skills: ${skillsList}
- Sertifikat: ${certsList}
- Portfolio: ${portfolioList}

INSTRUKSI:
1. Analisis profil mahasiswa secara mendalam
2. Berikan TEPAT 6 rekomendasi yang beragam, mencakup berbagai kategori
3. Setiap rekomendasi harus spesifik dan relevan dengan skill/jurusan mahasiswa
4. Jika mahasiswa belum punya skill, rekomendasikan langkah awal yang tepat berdasarkan jurusan/fakultasnya
5. Tulis dalam Bahasa Indonesia

WAJIB kembalikan respons dalam format JSON berikut (tanpa markdown code block, murni JSON):
{
  "summary": "Ringkasan singkat 1-2 kalimat tentang profil dan potensi mahasiswa",
  "recommendations": [
    {
      "title": "Judul rekomendasi yang jelas",
      "type": "Salah satu dari: Internship, Competition, Project, Learning Path, Career Path, Challenge",
      "description": "Deskripsi detail 2-3 kalimat tentang rekomendasi ini",
      "reason": "Alasan singkat kenapa ini cocok untuk mahasiswa tersebut"
    }
  ]
}`;
}

export async function generateAIRecommendations(
  ctx: StudentContext,
): Promise<AIRecommendationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables.");
  }

  const prompt = buildPrompt(ctx);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errBody = await response.text();
    console.error("[Gemini API Error]", response.status, errBody);
    if (response.status === 429) {
      throw new Error("Limit request ke Gemini API tercapai (Error 429). Tunggu beberapa saat lalu coba lagi.");
    }
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();

  // Extract text from Gemini response
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!text) {
    throw new Error("Empty response from Gemini API.");
  }

  // Parse JSON from the response (Gemini might wrap it in markdown code blocks)
  const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const parsed = JSON.parse(jsonStr) as AIRecommendationResult;

    // Validate structure
    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      throw new Error("Invalid response structure");
    }

    return {
      summary: parsed.summary ?? "",
      recommendations: parsed.recommendations.slice(0, 6).map((r) => ({
        title: r.title ?? "Untitled",
        type: r.type ?? "Learning Path",
        description: r.description ?? "",
        reason: r.reason ?? "",
      })),
    };
  } catch (parseErr) {
    console.error("[Gemini Parse Error]", parseErr, "Raw text:", text);
    throw new Error("Failed to parse AI response.");
  }
}
