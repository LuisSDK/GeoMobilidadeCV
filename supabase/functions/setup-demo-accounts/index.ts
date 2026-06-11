import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const accounts = [
      { email: "admin@geomobilidade.cv", password: "Admin@2024!", nome: "Carlos Tavares", role: "admin", organizacao: "NOSi EPE" },
      { email: "utilizador@geomobilidade.cv", password: "User@2024!", nome: "Ana Fonseca", role: "utilizador", organizacao: "Cidadão" },
    ];

    const results = [];

    for (const acc of accounts) {
      // Check if user already exists by listing users
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existing = listData?.users?.find((u: { email?: string }) => u.email === acc.email);

      let userId: string;

      if (existing) {
        userId = existing.id;
        // Update password in case it changed
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password: acc.password,
          user_metadata: { nome: acc.nome, role: acc.role },
        });
        results.push({ email: acc.email, status: "updated" });
      } else {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: acc.email,
          password: acc.password,
          email_confirm: true,
          user_metadata: { nome: acc.nome, role: acc.role },
        });
        if (error) {
          results.push({ email: acc.email, status: "error", message: error.message });
          continue;
        }
        userId = data.user.id;
        results.push({ email: acc.email, status: "created" });
      }

      // Upsert profile
      await supabaseAdmin.from("perfis").upsert({
        id: userId,
        email: acc.email,
        nome: acc.nome,
        role: acc.role,
        organizacao: acc.organizacao,
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
