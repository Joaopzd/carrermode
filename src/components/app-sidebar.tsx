import { Link, useRouterState } from "@tanstack/react-router";
import {
  Archive,
  CalendarDays,
  ClipboardList,
  GaugeCircle,
  LineChart,
  ListOrdered,
  Repeat,
  Shirt,
  Sprout,
  Settings,
  Target,
  Trophy,
  UserMinus,
  Users,
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

export const NAV_ITENS = [
  { title: "Dashboard", url: "/dashboard", icon: GaugeCircle },
  { title: "Calendário", url: "/calendario", icon: CalendarDays },
  { title: "Partidas", url: "/partidas", icon: ClipboardList },
  { title: "Estatísticas do Elenco", url: "/estatisticas", icon: LineChart },
  { title: "Classificação", url: "/classificacao", icon: ListOrdered },
  { title: "Transferências", url: "/transferencias", icon: Repeat },
  { title: "Categorias de Base", url: "/base", icon: Sprout },
  { title: "Elenco", url: "/elenco", icon: Shirt },
  { title: "Comissão Técnica", url: "/comissao", icon: Users },
  { title: "Metas da Diretoria", url: "/metas", icon: Target },
  { title: "Galeria de Troféus", url: "/trofeus", icon: Trophy },
  { title: "Ex-Jogadores", url: "/ex-jogadores", icon: UserMinus },
  { title: "Arquivo de Temporadas", url: "/arquivo", icon: Archive },
  { title: "Regras da Liga", url: "/regras-liga", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="hq-surface">
        <SidebarGroup>
          <SidebarGroupLabel className="font-display text-base tracking-widest text-primary">
            {collapsed ? "FC" : "Carreira FC"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITENS.map((item) => (
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
