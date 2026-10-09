"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  HeartPulse,
  Library,
  ListChecks,
  LogOut,
  Menu,
  MonitorSmartphone,
  Moon,
  Settings,
  Smartphone,
  Sparkles,
  Stethoscope,
  Sun,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export type AppRole = "ADMIN" | "NURSE";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: Record<AppRole, NavGroup[]> = {
  ADMIN: [
    {
      label: "Workspace",
      items: [
        { href: "/ask", label: "Ask", icon: Sparkles },
        { href: "/admin/trends", label: "Trends", icon: TrendingUp },
        { href: "/library", label: "Library", icon: Library },
        { href: "/admin/patients", label: "Patients", icon: Users },
      ],
    },
    {
      label: "Administration",
      items: [
        { href: "/admin/nurses", label: "Nurses", icon: Stethoscope },
        { href: "/admin/devices", label: "Devices", icon: Smartphone },
        { href: "/admin/preset-questions", label: "Preset questions", icon: ListChecks },
        { href: "/admin/trend-questions", label: "Trend questions", icon: ListChecks },
        { href: "/admin/qa-questions", label: "QA questions", icon: ListChecks },
        { href: "/admin/settings", label: "Settings", icon: Settings },
      ],
    },
  ],
  NURSE: [
    {
      label: "Workspace",
      items: [
        { href: "/ask", label: "Ask", icon: Sparkles },
        { href: "/library", label: "Library", icon: Library },
        { href: "/nurse/patients", label: "Patients", icon: Users },
      ],
    },
  ],
};

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Brand({ role }: { role: AppRole }) {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
        <HeartPulse className="size-4" />
      </div>
      <div className="grid leading-tight">
        <span className="text-sm font-semibold">Care RAG</span>
        <span className="text-muted-foreground text-xs">
          {role === "ADMIN" ? "Admin console" : "Nurse console"}
        </span>
      </div>
    </div>
  );
}

function SidebarNav({ role, onNavigate }: { role: AppRole; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6 px-3" aria-label="Main navigation">
      {NAV_GROUPS[role].map((group) => (
        <div key={group.label}>
          <p className="text-muted-foreground px-2 pb-2 text-xs font-medium tracking-wide">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-8 items-center gap-2.5 rounded-lg px-2 text-sm transition-colors outline-none",
                      "focus-visible:ring-ring/50 focus-visible:ring-2",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(mounted && resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
}

function UserMenu({ user }: { user: { name?: string | null; email?: string | null } }) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Account menu">
          <Avatar>
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
            {user.name ?? "Account"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="grid gap-0.5">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-muted-foreground truncate text-xs">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <MonitorSmartphone className="text-muted-foreground size-4" />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppShell({
  role,
  user,
  children,
}: {
  role: AppRole;
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-svh w-full">
      {/* Desktop sidebar */}
      <aside className="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r md:flex">
        <div className="flex h-14 items-center px-3">
          <Brand role={role} />
        </div>
        <ScrollArea className="flex-1 py-2">
          <SidebarNav role={role} />
        </ScrollArea>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        {/* Sticky header */}
        <header className="bg-background/80 sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open navigation">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="h-14 justify-center border-b px-3">
                <SheetTitle asChild>
                  <div>
                    <Brand role={role} />
                  </div>
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 py-2">
                <SidebarNav role={role} onNavigate={() => setMobileOpen(false)} />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div className="flex-1" />
          <ThemeToggle />
          <UserMenu user={user} />
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
