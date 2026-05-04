import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Mail, Settings, Hexagon, Target } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useT } from "@/lib/i18n";

const items = [
  { titleKey: "sidebar.dashboard" as const, url: "/", icon: LayoutDashboard },
  { titleKey: "sidebar.leads" as const, url: "/workspace", icon: Users },
  { titleKey: "sidebar.icp" as const, url: "/icp", icon: Target },
  { titleKey: "sidebar.forge" as const, url: "/forge", icon: Mail },
  { titleKey: "sidebar.settings" as const, url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => currentPath === p;
  const t = useT();

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5">
      <SidebarHeader className="border-b border-white/5">
        <Link to="/" className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-300/10 ring-1 ring-cyan-300/30">
            <Hexagon className="h-4 w-4 text-cyan-300" strokeWidth={2.2} />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Skerry</span>
              <span className="text-sm font-semibold text-gradient-cyber">LeadGen OS</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const label = t(item.titleKey);
                return (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={label}>
                      <Link to={item.url} className="flex items-center gap-2.5">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
);
}
