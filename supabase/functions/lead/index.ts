import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const BREVO_API_URL = "https://api.brevo.com/v3";

type LeadPayload = {
  name?: string;
  email?: string;
  whatsapp?: string;
  niche?: string;
  audience?: string;
  goal?: string;
  byok?: boolean;
  createdAt?: string;
  website?: string;
};

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value?: string) {
  return String(value || "").replace(/[^\d+]/g, "");
}

async function brevoRequest(path: string, init: RequestInit) {
  const response = await fetch(`${BREVO_API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": Deno.env.get("BREVO_API_KEY") || "",
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.message || "Brevo request failed");
  }

  return data;
}

async function upsertBrevoContact(lead: Required<Omit<LeadPayload, "createdAt" | "website">>) {
  const listId = Number(Deno.env.get("BREVO_LIST_ID"));
  const attributes: Record<string, string> = {
    FIRSTNAME: lead.name,
    WHATSAPP: normalizePhone(lead.whatsapp),
    NICHE: lead.niche,
    AUDIENCE: lead.audience,
    GOAL: lead.goal,
    BYOK: lead.byok ? "sim" : "nao",
    SOURCE: "landing-page",
  };

  Object.keys(attributes).forEach((key) => {
    if (!attributes[key]) delete attributes[key];
  });

  return brevoRequest("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email: normalizeEmail(lead.email),
      attributes,
      listIds: Number.isFinite(listId) ? [listId] : [],
      updateEnabled: true,
    }),
  });
}

async function sendWelcomeEmail(lead: Required<Omit<LeadPayload, "createdAt" | "website">>) {
  const templateId = Number(Deno.env.get("BREVO_TEMPLATE_ID"));
  if (!Number.isFinite(templateId)) return null;

  return brevoRequest("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      templateId,
      to: [{ email: normalizeEmail(lead.email), name: lead.name }],
      params: {
        name: lead.name,
        whatsapp: lead.whatsapp || "",
        niche: lead.niche,
        audience: lead.audience,
        goal: lead.goal,
        communityUrl: Deno.env.get("WHATSAPP_COMMUNITY_URL") || "",
      },
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const body = (await req.json().catch(() => ({}))) as LeadPayload;
  if (body.website) return json(200, { ok: true });

  const name = String(body.name || "").trim();
  const email = normalizeEmail(String(body.email || ""));
  const whatsapp = String(body.whatsapp || "").trim();
  const niche = String(body.niche || "").trim();
  const audience = String(body.audience || "").trim();
  const goal = String(body.goal || "").trim();
  const byok = body.byok === true;
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!name || !emailLooksValid || !niche || !audience || !goal || !byok) {
    return json(400, { error: "Missing required lead fields" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  );

  const lead = {
    name,
    email,
    whatsapp,
    niche,
    audience,
    goal,
    byok,
    source: "landing-page",
  };

  const { error } = await supabase
    .from("waitlist_leads")
    .upsert(lead, { onConflict: "email" });

  if (error) {
    return json(502, { error: error.message });
  }

  if (Deno.env.get("BREVO_API_KEY")) {
    try {
      await upsertBrevoContact(lead);
      await sendWelcomeEmail(lead);
    } catch (brevoError) {
      return json(502, {
        error: brevoError instanceof Error ? brevoError.message : "Brevo request failed",
      });
    }
  }

  return json(200, { ok: true });
});
