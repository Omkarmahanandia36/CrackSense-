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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? supabaseAnonKey;

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser();

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
    const { inspection_id, client_id, public_ids } = body;

    const publicIdsToDelete: string[] = [];
    let targetInspectionId: string | null = null;

    // Check if user is admin
    const { data: profile } = await supabaseAdminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isAdmin = profile?.role === "admin";

    // 1. Resolve inspection from DB if ID or client_id passed
    if (inspection_id || client_id) {
      let query = supabaseAdminClient
        .from("inspections")
        .select("id, user_id, image_public_id, annotated_public_id");

      if (inspection_id) {
        query = query.eq("id", inspection_id);
      } else {
        query = query.eq("client_id", client_id);
      }

      const { data: record, error: findError } = await query.single();
      if (findError || !record) {
        return new Response(
          JSON.stringify({ error: "Inspection record not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Security check: must be owner or admin
      if (record.user_id !== user.id && !isAdmin) {
        return new Response(
          JSON.stringify({ error: "Forbidden: You do not own this inspection" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      targetInspectionId = record.id;
      if (record.image_public_id) publicIdsToDelete.push(record.image_public_id);
      if (record.annotated_public_id) publicIdsToDelete.push(record.annotated_public_id);
    } else if (Array.isArray(public_ids) && public_ids.length > 0) {
      // Validate that all public_ids belong to the requesting user (or user is admin)
      for (const pid of public_ids) {
        if (!pid.startsWith(`cracksense/${user.id}/`) && !isAdmin) {
          return new Response(
            JSON.stringify({ error: `Forbidden: Cannot delete asset ${pid}` }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        publicIdsToDelete.push(pid);
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Must provide inspection_id, client_id, or public_ids" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Delete each asset from Cloudinary via Destroy API
    const deleteResults: Array<{ public_id: string; result: string }> = [];

    for (const pid of publicIdsToDelete) {
      const timestamp = Math.floor(Date.now() / 1000);
      const deliveryType = "authenticated";

      // Parameters to sign in alphabetical order: public_id, timestamp, type
      const paramsToSign = `public_id=${pid}&timestamp=${timestamp}&type=${deliveryType}`;
      const toSign = `${paramsToSign}${apiSecret}`;
      const signature = await sha1Hex(toSign);

      const formData = new FormData();
      formData.append("public_id", pid);
      formData.append("timestamp", String(timestamp));
      formData.append("type", deliveryType);
      formData.append("api_key", apiKey);
      formData.append("signature", signature);

      const cldRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        {
          method: "POST",
          body: formData,
        }
      );

      const cldData = await cldRes.json().catch(() => ({}));
      deleteResults.push({ public_id: pid, result: cldData.result || "unknown" });
    }

    // 3. Delete database record if inspection was targeted
    if (targetInspectionId) {
      await supabaseAdminClient
        .from("inspections")
        .delete()
        .eq("id", targetInspectionId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        inspection_id: targetInspectionId,
        deleted_assets: deleteResults,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
