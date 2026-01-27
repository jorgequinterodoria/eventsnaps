import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { createClient } from "npm:@supabase/supabase-js";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);

  return btoa(binary);
}

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405 });
    }

    const { photoId, storagePath, publicUrl } = await req.json() as { photoId?: string; storagePath?: string; publicUrl?: string };

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: "Missing Supabase environment variables" }), { status: 500 });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing Supabase or Gemini environment variables" }), { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let url = publicUrl || "";
    if (!url && storagePath) {
      const { data } = supabase.storage.from("photos").getPublicUrl(storagePath);
      url = data.publicUrl;
    }
    if (!url) {
      return new Response(JSON.stringify({ error: "No image URL available" }), { status: 400 });
    }

    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch image" }), { status: 400 });
    }
    const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    const base64 = toBase64(buf);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const modelCandidates = [
      Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash-latest",
      "gemini-1.5-pro-latest",
      "gemini-pro-vision",
      "gemini-1.0-pro-vision",
      "gemini-pro",
    ];

    const prompt = `You are an expert Trust & Safety content moderator for a general-audience social photo sharing platform. Respond in strict JSON: {"decision":"APPROVE|REJECT","confidence":<0..1>,"reason":"..."}.`;
    const AUTO_APPROVE_THRESHOLD = parseFloat(Deno.env.get("AUTO_APPROVE_THRESHOLD") || "0.9");

    for (const name of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({ model: name });
        const result = await model.generateContent([
          prompt,
          { inlineData: { data: base64, mimeType } },
        ]);
        const text = result.response.text().trim();
        let suggestion: "approve" | "reject" = "approve";
        let confidence = 0.8;
        let reason = "Content analysis completed";
        try {
          const parsed = JSON.parse(text) as { decision?: string; confidence?: number; reason?: string };
          const decision = (parsed.decision || "").toLowerCase();
          suggestion = decision === "reject" ? "reject" : "approve";
          confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.8;
          reason = parsed.reason || reason;
        } catch {
          const parts = text.split(" ");
          const first = parts[0]?.toLowerCase();
          suggestion = first === "reject" ? "reject" : "approve";
          confidence = parseFloat(parts[1]) || 0.8;
          reason = parts.slice(2).join(" ") || reason;
        }
        if (photoId) {
          await supabase.from("moderation_queues").update({ gemini_suggestion: suggestion, confidence_score: confidence }).eq("photo_id", photoId);
          if (suggestion === "reject" || (suggestion === "approve" && confidence >= AUTO_APPROVE_THRESHOLD)) {
            const nextStatus = suggestion === "reject" ? "rejected" : "approved";
            await supabase.from("photos").update({ status: nextStatus }).eq("id", photoId);
            await supabase.from("moderation_queues").update({ processed: true }).eq("photo_id", photoId);
            await supabase.from("moderation_actions").insert({
              photo_id: photoId,
              moderator_id: "system",
              action: nextStatus === "approved" ? "approve" : "reject",
              reason,
            });
          }
        }
        return new Response(JSON.stringify({ suggestion, confidence, reason }), { status: 200 });
      } catch {
        continue;
      }
    }

    return new Response(JSON.stringify({ suggestion: "reject", confidence: 0.0, reason: "AI Analysis Error - Flagged for manual review" }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}

// Export for Supabase
export const POST = handler;
