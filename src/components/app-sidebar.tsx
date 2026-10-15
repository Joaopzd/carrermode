import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Archive,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  GaugeCircle,
  Handshake,
  History,
  LineChart,
  ListOrdered,
  PieChart,
  Replace,
  Repeat,
  Shirt,
  Sprout,
  Settings,
  Target,
  Trophy,
  Trash2,
  UserMinus,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapse } from "@/components/motion";

const DASHBOARD = { title: "Dashboard", url: "/dashboard", icon: GaugeCircle } as const;

export const GRUPOS_NAV = [
  {
    id: "competicao",
    rotulo: "Competição",
    itens: [
      { title: "Calendário", url: "/calendario", icon: CalendarDays },
      { title: "Partidas", url: "/partidas", icon: ClipboardList },
      { title: "Classificação", url: "/classificacao", icon: ListOrdered },
      { title: "Galeria de Troféus", url: "/trofeus", icon: Trophy },
    ],
  },
  {
    id: "elenco",
    rotulo: "Elenco",
    itens: [
      { title: "Elenco", url: "/elenco", icon: Shirt },
      { title: "Estatísticas do Elenco", url: "/estatisticas", icon: LineChart },
      { title: "Análise de Elenco", url: "/analise-elenco", icon: PieChart },
      { title: "Categorias de Base", url: "/base", icon: Sprout },
      { title: "Comissão Técnica", url: "/comissao", icon: Users },
      { title: "Ex-Jogadores", url: "/ex-jogadores", icon: UserMinus },
    ],
  },
  {
    id: "clube",
    rotulo: "Clube",
    itens: [
      { title: "Transferências", url: "/transferencias", icon: Repeat },
      { title: "Relações com Clubes", url: "/relacoes-clubes", icon: Handshake },
      { title: "Treinador", url: "/treinador", icon: UserRound },
      { title: "Metas da Diretoria", url: "/metas", icon: Target },
      { title: "Histórico", url: "/historico", icon: History },
      { title: "Arquivo de Temporadas", url: "/arquivo", icon: Archive },
      { title: "Histórico de Carreira", url: "/historico-carreira", icon: History },
    ],
  },
  {
    id: "configuracoes",
    rotulo: "Configurações",
    itens: [
      { title: "Regras da Liga", url: "/regras-liga", icon: Settings },
      { title: "Finanças e Tema", url: "/configuracoes", icon: Wallet },
      { title: "Trocar Clube", url: "/trocar-clube", icon: Replace },
      { title: "Encerrar Passagem e Mudar de Clube", url: "/mudar-clube", icon: Repeat },
      { title: "Excluir carreira", url: "/excluir-carreira", icon: Trash2 },
    ],
  },
] as const;

/** Lista plana usada por outras telas (títulos, breadcrumbs). */
type NavItem = { title: string; url: string; icon: typeof GaugeCircle };

export const NAV_ITENS: readonly NavItem[] = [
  DASHBOARD,
  ...GRUPOS_NAV.flatMap((g) => g.itens as readonly NavItem[]),
];

const CHAVE_STORAGE = "carreira:nav-grupos";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  const grupoAtivo = GRUPOS_NAV.find((g) => g.itens.some((i) => i.url === currentPath))?.id;

  const [abertos, setAbertos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GRUPOS_NAV.map((g) => [g.id, g.id === grupoAtivo])),
  );
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(CHAVE_STORAGE);
      if (bruto) {
        const salvo = JSON.parse(bruto) as Record<string, boolean>;
        setAbertos((atual) => {
          const proximo = { ...atual };
          for (const g of GRUPOS_NAV) {
            const v = salvo[g.id];
            if (typeof v === "boolean") proximo[g.id] = v;
          }
          if (grupoAtivo) proximo[grupoAtivo] = true;
          return proximo;
        });
      }
    } catch {
      /* storage indisponível */
    }
    setHidratado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!grupoAtivo) return;
    setAbertos((atual) => (atual[grupoAtivo] ? atual : { ...atual, [grupoAtivo]: true }));
  }, [grupoAtivo]);

  function alternar(id: string) {
    setAbertos((atual) => {
      const proximo = { ...atual, [id]: !atual[id] };
      try {
        localStorage.setItem(CHAVE_STORAGE, JSON.stringify(proximo));
      } catch {
        /* storage indisponível */
      }
      return proximo;
    });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="hq-surface">
        <SidebarGroup>
          <SidebarGroupLabel className="font-display text-base tracking-widest text-primary">
            {collapsed ? "FC" : "Carreira FC"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={currentPath === DASHBOARD.url}>
                  <Link to={DASHBOARD.url} className="flex items-center gap-2">
                    <DASHBOARD.icon className="h-4 w-4" />
                    {!collapsed && <span>{DASHBOARD.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {GRUPOS_NAV.map((grupo) => {
          const aberto = collapsed || !hidratado ? true : !!abertos[grupo.id];
          const itens = (
            <SidebarMenu>
              {grupo.itens.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={currentPath === item.url}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          );

          return (
            <SidebarGroup key={grupo.id}>
              {!collapsed && (
                <SidebarGroupLabel asChild>
                  <button
                    type="button"
                    onClick={() => alternar(grupo.id)}
                    aria-expanded={aberto}
                    className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span>{grupo.rotulo}</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${aberto ? "" : "-rotate-90"}`}
                    />
                  </button>
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                {collapsed ? itens : <Collapse aberto={aberto}>{itens}</Collapse>}
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
