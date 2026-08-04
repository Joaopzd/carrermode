export const ESTILOS_TATICOS = [
  "Gegenpressing",
  "Park the Bus",
  "Counter Attack",
  "Kick and Rush",
  "Tiki-Taka",
  "Standard",
  "Wing Play",
] as const;

export const POSICOES = [
  "GOL",
  "ZAG",
  "LD",
  "LE",
  "VOL",
  "MC",
  "MEI",
  "PD",
  "PE",
  "SA",
  "CA",
] as const;

export const STATUS_JOGADOR = [
  "Liberado",
  "Lesionado",
  "Suspenso",
  "Em transição",
  "Convocado",
] as const;

export const CARGOS_STAFF = [
  "Preparador Físico",
  "Treinador de Goleiros",
  "Olheiro",
  "Médico",
  "Auxiliar Técnico",
] as const;

export { PAISES } from "./paises";


const PRIMEIROS_NOMES = [
  "Andrea",
  "Bruno",
  "Carlos",
  "Diego",
  "Eduardo",
  "Fabien",
  "Gustav",
  "Henrik",
  "Igor",
  "Javier",
  "Kevin",
  "Lucas",
  "Marco",
  "Nuno",
  "Oliver",
  "Paulo",
  "Rafael",
  "Sergio",
  "Thomas",
  "Vicente",
];

const SOBRENOMES = [
  "Almeida",
  "Bianchi",
  "Cardoso",
  "Dumont",
  "Esposito",
  "Ferreira",
  "González",
  "Hoffmann",
  "Iglesias",
  "Jensen",
  "Kovac",
  "Lindqvist",
  "Moreno",
  "Novak",
  "Oliveira",
  "Pereira",
  "Ricci",
  "Santos",
  "Toledo",
  "Vidal",
];

export function nomeAleatorio(): string {
  const p = PRIMEIROS_NOMES[Math.floor(Math.random() * PRIMEIROS_NOMES.length)];
  const s = SOBRENOMES[Math.floor(Math.random() * SOBRENOMES.length)];
  return `${p} ${s}`;
}
