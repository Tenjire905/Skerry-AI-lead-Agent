import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Mail,
  Settings,
  CreditCard,
} from "lucide-react";
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
import { Wordmark } from "@/components/nexus/Wordmark";
import { useT } from "@/lib/i18n";

const items = [
  { titleKey: "sidebar.dashboard" as const, url: "/", icon: LayoutDashboard },
  { titleKey: "sidebar.leads" as const, url: "/workspace", icon: Users },
  { titleKey: "sidebar.forge" as const, url: "/forge", icon: Mail },
  { title: "Billing", url: "/billing", icon: CreditCard },
  { titleKey: "sidebar.settings" as const, url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: r => r.location.pathname });
  const isActive = (p: string) => currentPath === p;
  const t = useT();

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5">
      <SidebarHeader className="border-b border-white/5">
        <Link to="/" className="flex items-center gap-2.5 px-2 py-1.5">
          <img
            src="/logo.png"
            alt="Skerry"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 drop-shadow-[0_0_18px_oklch(0.7_0.22_295_/_0.45)]"
          />
          {!collapsed && <Wordmark size="sm" />}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => {
                const label = "title" in item ? item.title : t(item.titleKey);
                return (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={label}
                    >
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
