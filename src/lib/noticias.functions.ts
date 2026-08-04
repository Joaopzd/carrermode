import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TipoEvento =
  | "jogador_banco"
  | "sequencia_negativa"
  | "venda_polemica"
  | "meta_risco"
  | "meta_cumprida";

const TIPO_NEWS: Record<TipoEvento, string> = {
  jogador_banco: "torcida",
  sequencia_negativa: "resultado",
  venda_polemica: "transferencia",
  meta_risco: "diretoria",
  meta_cumprida: "diretoria",
};

const TOM: Record<string, string> = {
  torcida: "um torcedor irritado escrevendo em um fórum de torcida",
  diretoria: "o diretor de futebol do clube em um discurso formal à imprensa",
  transferencia: "um âncora de telejornal esportivo",
  resultado: "um âncora de telejornal esportivo",
};

function promptSistema(tipoNews: string) {
  return [
    "Você escreve notícias curtas de um jornal esportivo fictício, sempre em português do Brasil.",
    `Escreva no tom de ${TOM[tipoNews] ?? "um âncora de telejornal esportivo"}.`,
    "A notícia deve ter de 2 a 4 frases e usar APENAS os dados fornecidos — nunca invente resultados, nomes ou números.",
    "Responda exatamente neste formato, sem markdown:",
    "TITULO: <título curto de até 60 caracteres>",
    "CORPO: <a notícia>",
  ].join(" \n");
}

async function chamarIA(sistema: string, dados: unknown): Promise<string> {
  const anthropicKey = process.env["ANTHROPIC_API_KEY"];
  const userMsg = `Dados do evento:\n${JSON.stringify(dados, null, 2)}`;

  if (anthropicKey) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system: sistema,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { content?: Array<{ text?: string }> };
    return json.content?.[0]?.text ?? "";
  }

  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Nenhuma chave de IA configurada");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      reasoning_effort: "none",
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: userMsg },
      ],
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(`IA ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

type Entrada = {
  saveId: string;
  tipo: TipoEvento;
  dados: Record<string, unknown>;
  relacionadoMatchId?: string;
  relacionadoPlayerId?: string;
};

export const gerarNoticia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Entrada) => {
    if (!input?.saveId || !input?.tipo) throw new Error("Dados inválidos");
    return input;
  })
  .handler(async ({ data, context }) => {
    const tipoNews = TIPO_NEWS[data.tipo] ?? "resultado";
    const texto = await chamarIA(promptSistema(tipoNews), { evento: data.tipo, ...data.dados });

    const linhaTitulo = /TITULO:\s*(.+)/i.exec(texto);
    const linhaCorpo = /CORPO:\s*([\s\S]+)/i.exec(texto);
    const titulo = (linhaTitulo?.[1] ?? "Notícia do clube").trim().slice(0, 120);
    const corpo = (linhaCorpo?.[1] ?? texto).trim();

    const { data: seasonAtiva } = await context.supabase
      .from("seasons")
      .select("id")
      .eq("save_id", data.saveId)
      .eq("status", "ativa")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: inserido, error } = await context.supabase
      .from("news_feed")
      .insert({
        save_id: data.saveId,
        season_id: seasonAtiva?.id ?? null,
        tipo: tipoNews,
        titulo,
        corpo,
        relacionado_match_id: data.relacionadoMatchId ?? null,
        relacionado_player_id: data.relacionadoPlayerId ?? null,
      })
      .select("id, titulo, corpo, tipo")
      .single();

    if (error) throw new Error(error.message);
    return inserido;
  });
