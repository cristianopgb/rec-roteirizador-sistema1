import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", "master@demo.com.br")
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ success: true, message: "Master admin já existe" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: matrizFilial } = await supabaseAdmin
      .from("filiais")
      .select("id")
      .eq("nome", "Matriz")
      .maybeSingle();

    if (!matrizFilial) {
      return new Response(
        JSON.stringify({ success: false, error: "Filial Matriz não encontrada" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: "master@demo.com.br",
      password: "123456",
      email_confirm: true,
    });

    if (createAuthError) {
      return new Response(
        JSON.stringify({ success: false, error: createAuthError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao criar usuário" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: profileInsertError } = await supabaseAdmin
      .from("profiles")
      .insert({
        auth_user_id: authData.user.id,
        nome: "Administrador Master",
        email: "master@demo.com.br",
        role: "admin",
        filial_id: matrizFilial.id,
        ativo: true,
      });

    if (profileInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Falha ao criar perfil: " + profileInsertError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Master admin criado com sucesso",
        email: "master@demo.com.br",
        password: "123456"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro ao criar master admin:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro inesperado" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
