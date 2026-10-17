import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EstatisticasLado, ExtracaoPartida, JogadorLido, LadoPartida } from "@/lib/partida-foto";

const SISTEMA = [
  "Você lê fotos de telas de estatísticas de partida do EA SPORTS FC (interface em português do Brasil).",
  "As fotos podem ser tiradas de uma TV ou monitor, com ângulo, reflexo e partes cortadas: leia o que estiver legível.",
  "Existem dois tipos de tela:",
  "1) RESUMO: placar no topo (time da esquerda, placar, time da direita), e uma tabela de estatísticas com o valor do time da ESQUERDA na coluna esquerda e o do time da DIREITA na coluna direita.",
  "   Linhas comuns: % Posse de bola, Recuperação de bola (segundos), Finalizações, Gols esperados, Passes, Divididas, Divididas ganhas, Interceptações, Defesas, Faltas cometidas, Impedimentos, Escanteios, Faltas, Pênaltis, Cartões amarelos, Cartões vermelhos, Desarmes.",
  "   Os círculos mostram percentuais: PRECISÃO NOS PASSES (use como precisao_passes_pct), taxa de dribles e precisão nas finalizações.",
  "2) DESEMPENHO INDIVIDUAL: tabela com colunas POS (código da posição), Nome, NF (nota final), G (gols), AST (assistências). Linhas com NF igual a N/D são jogadores que não entraram em campo: use nota null.",
  "   Quando aparecer o selo 'Melhor em campo' junto ao jogador destacado no topo, devolva o nome dele em melhor_em_campo.",
  "Regras: use ponto como separador decimal (a nota 6,6 vira 6.6). Se um valor não estiver visível ou legível, use null. NUNCA invente valores.",
  "Se houver várias fotos, junte as informações (por exemplo, a tabela de jogadores pode estar dividida em duas fotos rolando a lista; não repita o mesmo jogador).",
  "Responda SOMENTE com JSON válido, sem markdown, exatamente neste formato:",
  '{"esquerda":{"nome":string|null,"gols":number|null,"stats":{"posse_pct":number|null,"recuperacao_segundos":number|null,"finalizacoes":number|null,"gols_esperados":number|null,"passes":number|null,"precisao_passes_pct":number|null,"divididas_ganhas":number|null,"desarmes":number|null,"defesas":number|null,"cartoes_amarelos":number|null,"cartoes_vermelhos":number|null}},"direita":{ mesmo formato },"jogadores":[{"nome":string,"posicao":string|null,"nota":number|null,"gols":number|null,"assistencias":number|null}],"melhor_em_campo":string|null,"observacoes":string|null}',
].join("\n");

async function lerComIA(imagens: string[]): Promise<string> {
  const pedido = "Leia as imagens e devolva o JSON.";
  const anthropicKey = process.env["ANTHROPIC_API_KEY"];

  if (anthropicKey) {
    const content = [
      ...imagens.map((url) => {
        const [cab, dados] = url.split(",");
        const tipo = /data:(.*?);/.exec(cab ?? "")?.[1] ?? "image/jpeg";
        return { type: "image", source: { type: "base64", media_type: tipo, data: dados ?? "" } };
      }),
      { type: "text", text: pedido },
    ];
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        system: SISTEMA,
        messages: [{ role: "user", content }],
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
      max_completion_tokens: 3000,
      messages: [
        { role: "system", content: SISTEMA },
        {
          role: "user",
          content: [
            { type: "text", text: pedido },
            ...imagens.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        },
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

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", ".").replace("%", ""));
  return Number.isFinite(n) ? n : null;
};

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : null;

function lado(v: unknown): LadoPartida {
  const o = (v ?? {}) as Record<string, unknown>;
  const s = (o["stats"] ?? {}) as Record<string, unknown>;
  const stats: EstatisticasLado = {
    posse_pct: num(s["posse_pct"]),
    recuperacao_segundos: num(s["recuperacao_segundos"]),
    finalizacoes: num(s["finalizacoes"]),
    gols_esperados: num(s["gols_esperados"]),
    passes: num(s["passes"]),
    precisao_passes_pct: num(s["precisao_passes_pct"]),
    divididas_ganhas: num(s["divididas_ganhas"]),
    desarmes: num(s["desarmes"]),
    defesas: num(s["defesas"]),
    cartoes_amarelos: num(s["cartoes_amarelos"]),
    cartoes_vermelhos: num(s["cartoes_vermelhos"]),
  };
  return { nome: str(o["nome"]), gols: num(o["gols"]), stats };
}

function interpretar(texto: string): ExtracaoPartida {
  const ini = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (ini < 0 || fim <= ini) throw new Error("A IA não devolveu dados legíveis. Tente fotos mais nítidas.");
  let bruto: Record<string, unknown>;
  try {
    bruto = JSON.parse(texto.slice(ini, fim + 1)) as Record<string, unknown>;
  } catch {
    throw new Error("A IA devolveu um formato inválido. Tente novamente.");
  }
  const vistos = new Set<string>();
  const jogadores: JogadorLido[] = [];
  for (const j of (Array.isArray(bruto["jogadores"]) ? bruto["jogadores"] : []) as Record<string, unknown>[]) {
    const nome = str(j["nome"]);
    if (!nome || vistos.has(nome)) continue;
    vistos.add(nome);
    jogadores.push({
      nome,
      posicao: str(j["posicao"]),
      nota: num(j["nota"]),
      gols: num(j["gols"]),
      assistencias: num(j["assistencias"]),
    });
  }
  return {
    esquerda: lado(bruto["esquerda"]),
    direita: lado(bruto["direita"]),
    jogadores,
    melhor_em_campo: str(bruto["melhor_em_campo"]),
    observacoes: str(bruto["observacoes"]),
  };
}

export const extrairPartidaDeFotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imagens: string[] }) => {
    const imagens = input?.imagens;
    if (!Array.isArray(imagens) || imagens.length < 1 || imagens.length > 4) {
      throw new Error("Envie de 1 a 4 fotos.");
    }
    for (const url of imagens) {
      if (typeof url !== "string" || !url.startsWith("data:image/")) throw new Error("Imagem inválida.");
      if (url.length > 3_500_000) throw new Error("Uma das fotos é grande demais.");
    }
    return { imagens };
  })
  .handler(async ({ data }): Promise<ExtracaoPartida> => {
    const texto = await lerComIA(data.imagens);
    return interpretar(texto);
  });
