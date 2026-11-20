import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Compute SHA-1 hexadecimal digest. */
async function sha1Hex(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compute base64url encoding without padding. */
function base64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Generate Cloudinary signed delivery URL token (first 8 chars of base64url sha1). */
async function generateDeliverySignature(publicId: string, apiSecret: string): Promise<string> {
  const toSign = `${publicId}${apiSecret}`;
  const msgUint8 = new TextEncoder().encode(toSign);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8);
  return base64Url(hashBuffer).substring(0, 8);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired Supabase authentication session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME") || "";
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY") || "";
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET") || "";

    if (!cloudName || !apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: "Cloudinary credentials not configured in Supabase secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "upload";

    // ─────────────────────────────────────────────────────────────
    // ACTION 1: Generate Signed Upload Parameters
    // ─────────────────────────────────────────────────────────────
    if (action === "upload") {
      const clientId = body.client_id;
      if (!clientId || typeof clientId !== "string") {
        return new Response(
          JSON.stringify({ error: "client_id (UUID string) is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const assetType = body.asset_type === "annotated" ? "annotated" : "original";
      const sanitizedClientId = clientId.replace(/[^a-zA-Z0-9_-]/g, "");
      const publicId =
        assetType === "annotated" ? `${sanitizedClientId}_annotated` : sanitizedClientId;

      // Scoped strictly to the authenticated user's folder
      const folder = `cracksense/${user.id}`;
      const timestamp = Math.floor(Date.now() / 1000);
      const deliveryType = "authenticated";
      const overwrite = "true";

      // Cloudinary signature must sort parameters alphabetically by key:
      // folder, overwrite, public_id, timestamp, type
      const paramsToSign = `folder=${folder}&overwrite=${overwrite}&public_id=${publicId}&timestamp=${timestamp}&type=${deliveryType}`;
      const toSign = `${paramsToSign}${apiSecret}`;
      const signature = await sha1Hex(toSign);

      return new Response(
        JSON.stringify({
          cloud_name: cloudName,
          api_key: apiKey,
          timestamp,
          signature,
          folder,
          public_id: publicId,
          type: deliveryType,
          overwrite: true,
          full_public_id: `${folder}/${publicId}`,
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          max_file_size: 15728640, // 15 MB
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION 2: Generate Signed Delivery URL for Display
    // ─────────────────────────────────────────────────────────────
    if (action === "delivery_url") {
      const publicId = body.public_id;
      if (!publicId || typeof publicId !== "string") {
        return new Response(
          JSON.stringify({ error: "public_id is required for delivery URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Security check: ensure asset belongs to this user or user is admin
      const userFolderPrefix = `cracksense/${user.id}/`;
      if (!publicId.startsWith(userFolderPrefix)) {
        // Check if admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role !== "admin") {
          return new Response(
            JSON.stringify({ error: "Forbidden: Cannot access another user's image assets" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const sig = await generateDeliverySignature(publicId, apiSecret);
      const deliveryUrl = `https://res.cloudinary.com/${cloudName}/image/authenticated/s--${sig}--/${publicId}`;

      return new Response(
        JSON.stringify({
          public_id: publicId,
          delivery_url: deliveryUrl,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action '${action}'. Supported: 'upload', 'delivery_url'` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
