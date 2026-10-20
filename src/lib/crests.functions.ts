import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buscarEscudoClube } from "./club-escudo";
import { chaveClube, nomeCatalogoClube } from "./club-identidade";

/** Quantidade de clubes ainda sem escudo cadastrado. */
export const contarEscudosPendentes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("clubs")
      .select("id", { count: "exact", head: true })
      .is("escudo_url", null);
    if (error) throw new Error(error.message);
    return { pendentes: count ?? 0 };
  });

type Lote = { limite?: number; delayMs?: number };

/**
 * Sincroniza escudos a partir do TheSportsDB.
 * Processa em lotes curtos (limite) para caber no tempo de execução do servidor;
 * o cliente repete a chamada enquanto sobrarem pendentes.
 */
export const sincronizarEscudos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Lote | undefined) => ({
    limite: Math.min(Math.max(input?.limite ?? 10, 1), 25),
    delayMs: Math.min(Math.max(input?.delayMs ?? 2000, 0), 5000),
  }))
  .handler(async ({ data, context }) => {
    const { data: clubes, error } = await context.supabase
      .from("clubs")
      .select("id, nome, pais")
      .is("escudo_url", null)
      .order("nome")
      .limit(data.limite);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let atualizados = 0;
    let naoEncontrados = 0;
    let falhas = 0;

    for (const [i, clube] of (clubes ?? []).entries()) {
      if (i > 0 && data.delayMs > 0) {
        await new Promise((r) => setTimeout(r, data.delayMs));
      }
      try {
        const badge = await buscarEscudoClube(clube.nome, clube.pais);
        if (!badge) {
          naoEncontrados++;
          continue;
        }
        const { error: upErr } = await supabaseAdmin
          .from("clubs")
          .update({ escudo_url: badge })
          .eq("id", clube.id);
        if (upErr) falhas++;
        else atualizados++;
      } catch {
        falhas++;
      }
    }

    const { count } = await context.supabase
      .from("clubs")
      .select("id", { count: "exact", head: true })
      .is("escudo_url", null);

    return {
      processados: clubes?.length ?? 0,
      atualizados,
      naoEncontrados,
      falhas,
      pendentes: count ?? 0,
    };
  });

/** Correção manual do escudo de um clube. */
export const definirEscudoClube = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clubId: string; url: string | null }) => {
    if (!input?.clubId) throw new Error("Clube inválido");
    const url = input.url?.trim() ?? "";
    if (url && !/^https?:\/\//i.test(url) && !url.startsWith("data:image/")) {
      throw new Error("Informe uma URL http(s) válida.");
    }
    return { clubId: input.clubId, url: url || null };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("clubs")
      .update({ escudo_url: data.url })
      .eq("id", data.clubId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Cadastra um clube avulso no catálogo (sem liga) e já tenta preencher o escudo
 * com uma busca individual no TheSportsDB.
 */
export const cadastrarClubeCatalogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { nome: string; pais?: string | null }) => {
    const nome = input?.nome?.trim() ?? "";
    if (nome.length < 2) throw new Error("Informe o nome do clube.");
    return { nome: nomeCatalogoClube(nome), pais: input?.pais?.trim() || null };
  })
  .handler(async ({ data, context }) => {
    const { data: catalogo, error: erroCatalogo } = await context.supabase
      .from("clubs")
      .select("id, nome, escudo_url, league_id")
      .order("nome");
    if (erroCatalogo) throw new Error(erroCatalogo.message);
    const existente = catalogo?.find((clube) => chaveClube(clube.nome) === chaveClube(data.nome));
    if (existente) return existente;

    let escudo: string | null = null;
    try {
      escudo = await buscarEscudoClube(data.nome, data.pais);
    } catch {
      escudo = null;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: criado, error } = await supabaseAdmin
      .from("clubs")
      .insert({ nome: data.nome, pais: data.pais, escudo_url: escudo, league_id: null })
      .select("id, nome, escudo_url, league_id")
      .single();
    if (error) throw new Error(error.message);
    return criado;
  });
