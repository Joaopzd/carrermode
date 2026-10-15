import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tema dinâmico pela cor do clube.
 * Ordem de prioridade: cor definida à mão (por carreira) → tabela de clubes conhecidos →
 * cor extraída do escudo → padrão do tema. Só --club-primary, --club-primary-fg e
 * --club-secondary mudam; o fundo continua neutro.
 */

type Par = readonly [primaria: string, secundaria: string];

// [cor principal, cor secundária] dos clubes do catálogo. Clubes fora da lista usam o escudo.
const CORES: Record<string, Par> = {
  // Alemanha
  "SC Freiburg": ["#e2001a", "#ffffff"],
  "Borussia Dortmund": ["#fde100", "#000000"],
  "Bayern de Munique": ["#dc052d", "#ffffff"],
  "Bayer Leverkusen": ["#e32221", "#000000"],
  "RB Leipzig": ["#dd0741", "#ffffff"],
  "FC Augsburg": ["#ba3733", "#ffffff"],
  "Werder Bremen": ["#1d9053", "#ffffff"],
  "Mainz 05": ["#c3141e", "#ffffff"],
  "1. FC Köln": ["#ed1c24", "#ffffff"],
  "VfB Stuttgart": ["#e32219", "#ffffff"],
  "Hamburger SV": ["#005ca9", "#ffffff"],
  "Schalke 04": ["#004d9d", "#ffffff"],
  "Eintracht Frankfurt": ["#e1000f", "#000000"],
  "SC Paderborn": ["#0060a8", "#000000"],
  "Union Berlin": ["#eb1923", "#fed700"],
  "TSG Hoffenheim": ["#1961b5", "#ffffff"],
  "Borussia Mönchengladbach": ["#2ba05a", "#ffffff"],
  "Hertha BSC": ["#005ca9", "#ffffff"],
  "1. FC Nürnberg": ["#b0192e", "#000000"],
  "1. FC Heidenheim": ["#e2001a", "#00386c"],
  "1. FC Magdeburg": ["#0060a8", "#ffffff"],
  "VfL Wolfsburg": ["#65b32e", "#ffffff"],
  Kaiserslautern: ["#d4141c", "#ffffff"],
  "FC St. Pauli": ["#6b3d24", "#ffffff"],
  "Energie Cottbus": ["#e2001a", "#ffffff"],
  "Arminia Bielefeld": ["#0060ac", "#000000"],
  "VfL Osnabrück": ["#702b8c", "#ffffff"],
  "Eintracht Braunschweig": ["#fdd835", "#0b3a82"],
  "VfL Bochum": ["#005ca9", "#ffffff"],
  "Hannover 96": ["#008d3f", "#000000"],
  "Darmstadt 98": ["#004e9e", "#ffffff"],
  "SpVgg Greuther Fürth": ["#00a650", "#ffffff"],
  "Dynamo Dresden": ["#f7d10a", "#000000"],
  "Karlsruher SC": ["#0057a8", "#ffffff"],
  "Holstein Kiel": ["#005ca9", "#ffffff"],
  Duisburg: ["#005ca9", "#ffffff"],
  "Viktoria Köln": ["#e2001a", "#ffffff"],
  "Rot-Weiss Essen": ["#e2001a", "#ffffff"],
  "Hansa Rostock": ["#0060a8", "#ffffff"],
  Saarbrücken: ["#0060a8", "#000000"],
  "SV Waldhof Mannheim": ["#0079c1", "#000000"],
  "Preußen Münster": ["#0a8f3c", "#ffffff"],
  "Alemannia Aachen": ["#fed700", "#000000"],
  "Fortuna Düsseldorf": ["#e2001a", "#ffffff"],
  "Fortuna Köln": ["#e2001a", "#ffffff"],
  "Jahn Regensburg": ["#e2001a", "#ffffff"],
  "FC Ingolstadt": ["#e2001a", "#000000"],
  "Wehen Wiesbaden": ["#e2001a", "#ffffff"],
  "Würzburger Kickers": ["#e2001a", "#ffffff"],
  // Espanha
  Barcelona: ["#a50044", "#004d98"],
  "Atlético Madrid": ["#cb3524", "#272e61"],
  "Real Betis": ["#0bb363", "#ffffff"],
  "Real Madrid": ["#3b6fd4", "#ffffff"],
  Sevilla: ["#d71920", "#ffffff"],
  "Real Sociedad": ["#0067b1", "#ffffff"],
  Alavés: ["#0067b1", "#ffffff"],
  "Deportivo La Coruña": ["#0059a9", "#ffffff"],
  "Celta Vigo": ["#8ac3ee", "#e5254c"],
  "Athletic Bilbao": ["#ee2523", "#ffffff"],
  Villarreal: ["#fbe10f", "#00519e"],
  Espanyol: ["#007fc8", "#ffffff"],
  "Rayo Vallecano": ["#ee2523", "#ffffff"],
  Getafe: ["#005999", "#ffffff"],
  "Racing Santander": ["#00a651", "#ffffff"],
  Osasuna: ["#d91a21", "#0a1c46"],
  Levante: ["#a50044", "#0a4a9e"],
  Elche: ["#00a651", "#ffffff"],
  Valencia: ["#ff7a00", "#000000"],
  Málaga: ["#0066b3", "#ffffff"],
  Almería: ["#e2001a", "#ffffff"],
  Eibar: ["#003b7a", "#a50034"],
  Mallorca: ["#e20613", "#000000"],
  "CE Sabadell": ["#0068b4", "#ffffff"],
  "Sporting Gijón": ["#e2001a", "#ffffff"],
  Girona: ["#e8212b", "#ffffff"],
  "Real Oviedo": ["#0a5ca8", "#ffffff"],
  Granada: ["#d4001a", "#ffffff"],
  "Real Valladolid": ["#5f2c82", "#ffffff"],
  Tenerife: ["#0a5ca8", "#ffffff"],
  "Las Palmas": ["#fdd835", "#0a3b8c"],
  Leganés: ["#0b6fb8", "#ffffff"],
  Córdoba: ["#00873e", "#ffffff"],
  Cádiz: ["#fdd835", "#0a3b8c"],
  // França
  Monaco: ["#e2001a", "#ffffff"],
  Lille: ["#e2001a", "#1c2d5a"],
  Rennes: ["#e2001a", "#000000"],
  Lyon: ["#2149a8", "#e2001a"],
  "Paris FC": ["#0a2a6e", "#ffffff"],
  "Paris Saint-Germain": ["#004170", "#da291c"],
  Brest: ["#e2001a", "#ffffff"],
  Lorient: ["#f58220", "#000000"],
  Nice: ["#e2001a", "#000000"],
  Lens: ["#fcd116", "#e2001a"],
  Strasbourg: ["#009fe3", "#ffffff"],
  Marseille: ["#2faee0", "#ffffff"],
  "Le Mans": ["#fdd835", "#e2001a"],
  Toulouse: ["#6a1fa0", "#ffffff"],
  Auxerre: ["#0a5ca8", "#ffffff"],
  Troyes: ["#0a5ca8", "#ffffff"],
  "Le Havre": ["#0a7bd1", "#0a3b6e"],
  "Saint-Étienne": ["#00a651", "#ffffff"],
  "Red Star": ["#0b8f3f", "#ffffff"],
  Montpellier: ["#f58220", "#0a3b8c"],
  Reims: ["#e2001a", "#ffffff"],
  Nancy: ["#e2001a", "#ffffff"],
  Dijon: ["#e2001a", "#ffffff"],
  Pau: ["#fdd835", "#0a3b8c"],
  Sochaux: ["#fdd835", "#0a3b8c"],
  Metz: ["#8a1538", "#ffffff"],
  Guingamp: ["#e2001a", "#000000"],
  Nantes: ["#fdd835", "#00a651"],
  "Clermont Foot": ["#e2001a", "#0a3b8c"],
  Laval: ["#f58220", "#000000"],
  // Inglaterra
  "Manchester City": ["#6cabdd", "#ffffff"],
  Arsenal: ["#ef0107", "#ffffff"],
  "Brighton & Hove Albion": ["#0057b8", "#ffffff"],
  Brentford: ["#e30613", "#ffffff"],
  Everton: ["#003399", "#ffffff"],
  Chelsea: ["#034694", "#ffffff"],
  "Leeds United": ["#ffcd00", "#1d428a"],
  "Hull City": ["#f5a12d", "#000000"],
  Liverpool: ["#c8102e", "#ffffff"],
  "Ipswich Town": ["#0044aa", "#ffffff"],
  "Newcastle United": ["#9ba4ae", "#000000"],
  "Crystal Palace": ["#1b458f", "#c4122e"],
  "Manchester United": ["#da291c", "#fbe122"],
  "Coventry City": ["#59a5dc", "#ffffff"],
  "Nottingham Forest": ["#dd0000", "#ffffff"],
  "Aston Villa": ["#670e36", "#95bfe5"],
  Sunderland: ["#eb172b", "#ffffff"],
  Bournemouth: ["#da291c", "#000000"],
  "Tottenham Hotspur": ["#1b3a8c", "#ffffff"],
  Fulham: ["#c8102e", "#000000"],
  Middlesbrough: ["#e2001a", "#ffffff"],
  "West Ham United": ["#7a263a", "#1bb1e7"],
  "Stoke City": ["#e03a3e", "#ffffff"],
  "Wolverhampton Wanderers": ["#fdb913", "#231f20"],
  "Queens Park Rangers": ["#005caa", "#ffffff"],
  "Birmingham City": ["#0a4ba8", "#ffffff"],
  Millwall: ["#001d5e", "#ffffff"],
  "West Bromwich Albion": ["#122f67", "#ffffff"],
  "Bristol City": ["#e21a22", "#ffffff"],
  Southampton: ["#d71920", "#ffffff"],
  "Charlton Athletic": ["#d4021d", "#ffffff"],
  "Blackburn Rovers": ["#009ee0", "#ffffff"],
  "Sheffield United": ["#ee2737", "#000000"],
  Wrexham: ["#e2001a", "#ffffff"],
  "Lincoln City": ["#e2001a", "#ffffff"],
  "Bolton Wanderers": ["#263c7e", "#ffffff"],
  "Norwich City": ["#00a650", "#fff200"],
  Portsmouth: ["#001489", "#ffffff"],
  Watford: ["#fbee23", "#ed2127"],
  "Cardiff City": ["#0070b5", "#ffffff"],
  Burnley: ["#6c1d45", "#99d6ea"],
  "Plymouth Argyle": ["#00693e", "#ffffff"],
  "Bradford City": ["#7a1e3c", "#f5a623"],
  "Stockport County": ["#005caa", "#ffffff"],
  "Huddersfield Town": ["#0e63ad", "#ffffff"],
  "Cambridge United": ["#f5a623", "#000000"],
  Reading: ["#004494", "#ffffff"],
  "Sheffield Wednesday": ["#0e4c92", "#ffffff"],
  "Oxford United": ["#fdd835", "#0a3b8c"],
  Stevenage: ["#e2001a", "#ffffff"],
  "Burton Albion": ["#fdd835", "#000000"],
  "AFC Wimbledon": ["#0a3b8c", "#fdd835"],
  "Leyton Orient": ["#e2001a", "#ffffff"],
  "Luton Town": ["#f78f1e", "#0a3b8c"],
  "Mansfield Town": ["#fdd835", "#0a3b8c"],
  "Wycombe Wanderers": ["#0a3b8c", "#6cb7e6"],
  "Doncaster Rovers": ["#e2001a", "#ffffff"],
  "Leicester City": ["#003090", "#fdbe11"],
  Blackpool: ["#f68712", "#ffffff"],
  Barnsley: ["#e2001a", "#ffffff"],
  "Peterborough United": ["#0b5ca8", "#ffffff"],
  "Wigan Athletic": ["#1d59b3", "#ffffff"],
  "Salford City": ["#e2001a", "#ffffff"],
  Barnet: ["#f5a623", "#000000"],
  "Crewe Alexandra": ["#e2001a", "#ffffff"],
  Gillingham: ["#0a3b8c", "#ffffff"],
  "York City": ["#e2001a", "#0a3b8c"],
  Walsall: ["#e2001a", "#ffffff"],
  Chesterfield: ["#0a5ca8", "#ffffff"],
  "Cheltenham Town": ["#e2001a", "#ffffff"],
  "Bristol Rovers": ["#0a5ca8", "#ffffff"],
  "Rochdale AFC": ["#0a5ca8", "#000000"],
  "Newport County": ["#f5a623", "#000000"],
  "Exeter City": ["#e2001a", "#ffffff"],
  "Accrington Stanley": ["#e2001a", "#ffffff"],
  "Fleetwood Town": ["#e2001a", "#ffffff"],
  "Swindon Town": ["#e2001a", "#ffffff"],
  "Shrewsbury Town": ["#0a5ca8", "#fdd835"],
  "Colchester United": ["#0a5ca8", "#ffffff"],
  "Rotherham United": ["#e2001a", "#ffffff"],
  "Oldham Athletic": ["#0a5ca8", "#ffffff"],
  "Northampton Town": ["#7a1f3d", "#ffffff"],
  "Crawley Town": ["#e2001a", "#ffffff"],
  // Itália
  "Inter de Milão": ["#1b5fbf", "#000000"],
  Lazio: ["#87d8f7", "#ffffff"],
  Roma: ["#c5281c", "#f0a830"],
  Cagliari: ["#a6192e", "#0a3b8c"],
  Milan: ["#fb090b", "#000000"],
  Como: ["#0a3b8c", "#ffffff"],
  Napoli: ["#12a0d7", "#ffffff"],
  Frosinone: ["#f5d90a", "#0a3b8c"],
  Atalanta: ["#1e71b8", "#000000"],
  Sassuolo: ["#00a651", "#000000"],
  Torino: ["#8a1538", "#ffffff"],
  Lecce: ["#f5d90a", "#e2001a"],
  Bologna: ["#a6192e", "#0a2a5e"],
  Monza: ["#e2001a", "#ffffff"],
  Genoa: ["#a6192e", "#0a2a5e"],
  Parma: ["#fdd835", "#0a3b8c"],
  Fiorentina: ["#5b2a86", "#ffffff"],
  Venezia: ["#f58220", "#00a651"],
  Palermo: ["#e8789a", "#000000"],
  Mantova: ["#e2001a", "#ffffff"],
  Modena: ["#fdd835", "#0a3b8c"],
  Sudtirol: ["#e2001a", "#ffffff"],
  Avellino: ["#00a651", "#ffffff"],
  Pisa: ["#0a3b8c", "#000000"],
  Benevento: ["#fdd835", "#e2001a"],
  "Hellas Verona": ["#fdd835", "#0a3b8c"],
  Padova: ["#e2001a", "#ffffff"],
  Arezzo: ["#a6192e", "#ffffff"],
  "Virtus Entella": ["#0a5ca8", "#ffffff"],
  Cremonese: ["#a6192e", "#6c6c6c"],
  Empoli: ["#0a5ca8", "#ffffff"],
  "LR Vicenza": ["#e2001a", "#ffffff"],
  Carrarese: ["#fdd835", "#0a3b8c"],
  Sampdoria: ["#0a5ca8", "#ffffff"],
  Catanzaro: ["#e2001a", "#fdd835"],
  "Juve Stabia": ["#fdd835", "#0a3b8c"],
  // Portugal
  Porto: ["#003a8c", "#ffffff"],
  Benfica: ["#e2001a", "#ffffff"],
  "Sporting CP": ["#00a651", "#ffffff"],
  "Santa Clara": ["#e2001a", "#ffffff"],
  Arouca: ["#fdd835", "#0a3b8c"],
  "Académico de Viseu": ["#0a5ca8", "#ffffff"],
  Alverca: ["#e2001a", "#ffffff"],
  "Gil Vicente": ["#e2001a", "#0a3b8c"],
  Braga: ["#e2001a", "#ffffff"],
  "Estrela da Amadora": ["#00a651", "#e2001a"],
  Moreirense: ["#00a651", "#ffffff"],
  Marítimo: ["#00a651", "#e2001a"],
  Famalicão: ["#0a5ca8", "#ffffff"],
  "Rio Ave": ["#00a651", "#ffffff"],
  "Casa Pia": ["#fdd835", "#000000"],
  "Estoril Praia": ["#fdd835", "#0a3b8c"],
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const TABELA = new Map<string, Par>(Object.entries(CORES).map(([k, v]) => [norm(k), v]));

export type CoresClube = { primaria: string; secundaria: string };

const PREFIXO_MANUAL = "carreira:tema-manual:";
const PREFIXO_AUTO = "carreira:tema-auto:";
const CHAVE_ULTIMO = "carreira:tema-clube";

// ---------- cor ----------
type RGB = [number, number, number];

function hexParaRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}

const rgbParaHex = ([r, g, b]: RGB) =>
  `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

function luminancia([r, g, b]: RGB): number {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function misturar(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Clareia cores muito escuras para continuarem visíveis em fundo grafite. */
function paraTemaEscuro(hex: string): string {
  let rgb = hexParaRgb(hex);
  let guarda = 0;
  while (luminancia(rgb) < 0.14 && guarda++ < 12) rgb = misturar(rgb, [255, 255, 255], 0.12);
  return rgbParaHex(rgb);
}

export function aplicarTema(cores: CoresClube | null) {
  if (typeof document === "undefined") return;
  const raiz = document.documentElement.style;
  if (!cores) {
    raiz.removeProperty("--club-primary");
    raiz.removeProperty("--club-primary-fg");
    raiz.removeProperty("--club-secondary");
    return;
  }
  const primaria = paraTemaEscuro(cores.primaria);
  const texto = luminancia(hexParaRgb(primaria)) > 0.42 ? "#111111" : "#ffffff";
  raiz.setProperty("--club-primary", primaria);
  raiz.setProperty("--club-primary-fg", texto);
  raiz.setProperty("--club-secondary", cores.secundaria);
}

// ---------- extração do escudo ----------
function extrairDoEscudo(url: string): Promise<CoresClube | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const limite = window.setTimeout(() => resolve(null), 4000);
    img.onerror = () => {
      window.clearTimeout(limite);
      resolve(null);
    };
    img.onload = () => {
      window.clearTimeout(limite);
      try {
        const t = 48;
        const canvas = document.createElement("canvas");
        canvas.width = t;
        canvas.height = t;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, t, t);
        const dados = ctx.getImageData(0, 0, t, t).data;
        const baldes = new Map<string, { peso: number; soma: RGB }>();
        for (let i = 0; i < dados.length; i += 4) {
          const [r, g, b, a] = [dados[i]!, dados[i + 1]!, dados[i + 2]!, dados[i + 3]!];
          if (a < 128) continue;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max === 0 ? 0 : (max - min) / max;
          if (sat < 0.3 || max < 50 || min > 225) continue;
          const chave = `${r >> 5}-${g >> 5}-${b >> 5}`;
          const atual = baldes.get(chave) ?? { peso: 0, soma: [0, 0, 0] as RGB };
          atual.peso += sat;
          atual.soma = [atual.soma[0] + r * sat, atual.soma[1] + g * sat, atual.soma[2] + b * sat];
          baldes.set(chave, atual);
        }
        const ordenados = [...baldes.values()].sort((x, y) => y.peso - x.peso);
        const topo = ordenados[0];
        if (!topo) return resolve(null);
        const cor = (v: { peso: number; soma: RGB }): RGB => [
          v.soma[0] / v.peso,
          v.soma[1] / v.peso,
          v.soma[2] / v.peso,
        ];
        const primaria = cor(topo);
        const segundo = ordenados.find((v) => {
          const c = cor(v);
          return Math.abs(c[0] - primaria[0]) + Math.abs(c[1] - primaria[1]) + Math.abs(c[2] - primaria[2]) > 120;
        });
        resolve({
          primaria: rgbParaHex(primaria),
          secundaria: segundo ? rgbParaHex(cor(segundo)) : "#ffffff",
        });
      } catch {
        resolve(null); // imagem de outro domínio sem CORS
      }
    };
    img.src = url;
  });
}

// ---------- cores manuais (por carreira) ----------
export function lerCoresManuais(saveId: string | null | undefined): CoresClube | null {
  if (!saveId || typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(PREFIXO_MANUAL + saveId);
    return bruto ? (JSON.parse(bruto) as CoresClube) : null;
  } catch {
    return null;
  }
}

export function salvarCoresManuais(saveId: string, cores: CoresClube | null) {
  if (typeof window === "undefined") return;
  if (cores) window.localStorage.setItem(PREFIXO_MANUAL + saveId, JSON.stringify(cores));
  else window.localStorage.removeItem(PREFIXO_MANUAL + saveId);
  ultimaConsulta = 0;
}

/** Cor "de fábrica" do clube (tabela ou escudo), sem considerar ajuste manual. */
export async function corPadraoDoClube(
  nome: string | null | undefined,
  escudoUrl: string | null | undefined,
): Promise<CoresClube | null> {
  if (nome) {
    const achada = TABELA.get(norm(nome));
    if (achada) return { primaria: achada[0], secundaria: achada[1] };
  }
  const chaveAuto = PREFIXO_AUTO + norm(`${nome ?? ""}|${escudoUrl ?? ""}`.slice(0, 120));
  try {
    const salvo = window.localStorage.getItem(chaveAuto);
    if (salvo) return JSON.parse(salvo) as CoresClube;
  } catch {
    /* storage indisponível */
  }
  if (!escudoUrl) return null;
  const extraida = await extrairDoEscudo(escudoUrl);
  if (extraida) {
    try {
      window.localStorage.setItem(chaveAuto, JSON.stringify(extraida));
    } catch {
      /* storage indisponível */
    }
  }
  return extraida;
}

// ---------- aplicação no app ----------
let ultimaConsulta = 0;

async function atualizarTema() {
  if (Date.now() - ultimaConsulta < 30_000) return;
  ultimaConsulta = Date.now();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return;
  const { data: save } = await supabase
    .from("saves")
    .select("id")
    .eq("user_id", userId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!save) return;
  const { data: stint } = await supabase
    .from("stints")
    .select("escudo_url, clubs(nome, escudo_url)")
    .eq("save_id", save.id as string)
    .eq("status", "ativa")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  const bruto = stint?.clubs as
    | { nome: string; escudo_url: string | null }
    | { nome: string; escudo_url: string | null }[]
    | null
    | undefined;
  const clube = Array.isArray(bruto) ? (bruto[0] ?? null) : (bruto ?? null);
  const cores =
    lerCoresManuais(save.id as string) ??
    (await corPadraoDoClube(clube?.nome, stint?.escudo_url ?? clube?.escudo_url));
  aplicarTema(cores);
  try {
    window.localStorage.setItem(CHAVE_ULTIMO, JSON.stringify(cores));
  } catch {
    /* storage indisponível */
  }
}

/** Aplica a cor do clube em todo o app. Usado no AppShell. */
export function useTemaDoClube() {
  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(CHAVE_ULTIMO);
      if (salvo) aplicarTema(JSON.parse(salvo) as CoresClube | null);
    } catch {
      /* storage indisponível */
    }
    void atualizarTema();
  }, []);
}
