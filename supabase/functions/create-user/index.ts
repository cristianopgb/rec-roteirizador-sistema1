import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateUserRequest {
  nome: string;
  email: string;
  password: string;
  role: "admin" | "user";
  filial_id: string;
}

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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      console.error("Auth header ausente");
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Criar cliente com anon key para validar o token do usuário
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verificar autenticação do usuário
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Erro de autenticação:", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Usuário autenticado:", user.id);

    // Usar service role para verificar permissões e criar usuário
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, ativo")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    console.log("Profile do admin:", adminProfile, "Erro:", profileError);

    if (profileError || !adminProfile || adminProfile.role !== "admin" || !adminProfile.ativo) {
      console.error("Usuário não é admin ou está inativo");
      return new Response(
        JSON.stringify({ success: false, error: "Apenas administradores podem criar usuários" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestData: CreateUserRequest = await req.json();
    console.log("Dados recebidos:", { ...requestData, password: "[REDACTED]" });

    const { nome, email, password, role, filial_id } = requestData;

    // Log detalhado de validação
    const missingFields = [];
    if (!nome) missingFields.push('nome');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!role) missingFields.push('role');
    if (!filial_id) missingFields.push('filial_id');

    if (missingFields.length > 0) {
      console.error("Campos faltando:", missingFields);
      return new Response(
        JSON.stringify({ success: false, error: `Dados incompletos. Faltando: ${missingFields.join(', ')}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Validação de campos OK");

    if (password.length < 8) {
      console.error("Senha muito curta:", password.length);
      return new Response(
        JSON.stringify({ success: false, error: "Senha deve ter no mínimo 8 caracteres" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Validação de senha OK, criando usuário no Auth...");

    // Verificar se email já existe
    const { data: existingUser } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      console.error("Email já existe:", email);
      return new Response(
        JSON.stringify({ success: false, error: "Email já cadastrado no sistema" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createAuthError) {
      console.error("Erro ao criar usuário no Auth:", createAuthError);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao criar autenticação: ${createAuthError.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Usuário criado no Auth com sucesso:", authData.user?.id);

    if (!authData.user) {
      console.error("authData.user é nulo/undefined");
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao criar usuário no sistema de autenticação" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Inserindo perfil no banco de dados...", {
      auth_user_id: authData.user.id,
      nome,
      email,
      role,
      filial_id,
    });

    const { error: profileInsertError } = await supabaseAdmin
      .from("profiles")
      .insert({
        auth_user_id: authData.user.id,
        nome,
        email,
        role,
        filial_id,
        ativo: true,
      });

    if (profileInsertError) {
      console.error("Erro ao inserir perfil:", profileInsertError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Falha ao criar perfil do usuário: " + profileInsertError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Usuário criado com sucesso!");

    return new Response(
      JSON.stringify({ success: true, userId: authData.user.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro inesperado ao criar usuário" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
