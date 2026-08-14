import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const API = "https://www.thesportsdb.com/api/v1/json/123/searchteams.php";

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
      .select("id, nome")
      .is("escudo_url", null)
      .order("nome")
      .limit(data.limite);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let atualizados = 0;
    let naoEncontrados = 0;
    let falhas = 0;

    for (let i = 0; i < (clubes?.length ?? 0); i++) {
      const clube = clubes![i]!;
      if (i > 0 && data.delayMs > 0) {
        await new Promise((r) => setTimeout(r, data.delayMs));
      }
      try {
        const res = await fetch(`${API}?t=${encodeURIComponent(clube.nome)}`, {
          headers: { accept: "application/json" },
        });
        if (!res.ok) {
          falhas++;
          continue;
        }
        const json = (await res.json()) as {
          teams?: Array<{ strTeamBadge?: string | null; strSport?: string | null }> | null;
        };
        const time =
          json.teams?.find((t) => t.strSport === "Soccer" && t.strTeamBadge) ??
          json.teams?.find((t) => t.strTeamBadge);
        const badge = time?.strTeamBadge ?? null;
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
