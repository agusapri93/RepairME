import { Fragment, useEffect, useState } from "react";
import { ChevronFirst, ChevronRight, Menu } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router";
import { useAuth } from "../../auth";
import { MENU, menuTrail, visibleMenu } from "../../config/menu";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo, LogoMark } from "./Logo";
import { SidebarMenu } from "./SidebarMenu";
import { UserMenu } from "./UserMenu";

const COLLAPSE_KEY = "sidebar-collapse";

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Metronic "demo1" layout: fixed sidebar on desktop, sheet menu on mobile, sticky header. */
export function AppLayout() {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    const body = document.body.classList;
    body.add("demo1", "sidebar-fixed", "header-fixed");
    const timer = setTimeout(() => body.add("layout-initialized"), 300);
    return () => {
      body.remove("demo1", "sidebar-fixed", "header-fixed", "layout-initialized", "sidebar-collapse");
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapse", collapsed);
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  return (
    <>
      {!isMobile && (
        <aside className="sidebar bg-background lg:fixed lg:top-0 lg:bottom-0 lg:z-20 lg:flex lg:border-e lg:border-border flex-col items-stretch shrink-0">
          <div className="sidebar-header relative hidden shrink-0 items-center justify-between px-3 lg:flex lg:px-6">
            {/* Plain wrappers: layout.css toggles their display, which a `flex` utility would override. */}
            <Link to="/" className="flex items-center" aria-label="RepairME">
              <span className="default-logo">
                <Logo />
              </span>
              <span className="small-logo">
                <LogoMark />
              </span>
            </Link>
            <Button
              onClick={() => setCollapsed(!collapsed)}
              size="sm"
              mode="icon"
              variant="outline"
              aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
              className={cn(
                "absolute start-full top-2/4 size-7 -translate-x-2/4 -translate-y-2/4",
                collapsed && "rotate-180",
              )}
            >
              <ChevronFirst className="size-4!" />
            </Button>
          </div>
          <div className="overflow-hidden">
            <div className="w-(--sidebar-default-width)">
              <SidebarMenu />
            </div>
          </div>
        </aside>
      )}

      {/* min-w-0 keeps wide, non-wrapping content (tabs, tables) from stretching the page on mobile. */}
      <div className="wrapper flex min-w-0 grow flex-col">
        <Header isMobile={isMobile} />
        <main className="grow pt-5" role="main">
          <Outlet />
        </main>
        <footer className="py-5">
          <div className="mx-auto w-full max-w-[1320px] px-4 text-sm text-muted-foreground lg:px-6">
            {new Date().getFullYear()} © RepairME — Manajemen Aset & Laporan Kerusakan
          </div>
        </footer>
      </div>
    </>
  );
}

function Header({ isMobile }: { isMobile: boolean }) {
  const { pathname } = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setSheetOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "header fixed end-0 top-0 z-10 flex shrink-0 items-stretch border-b border-transparent bg-background",
        scrolled && "border-border",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1320px] items-stretch justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-2.5">
          {isMobile && (
            <>
              <Link to="/" aria-label="RepairME">
                <LogoMark />
              </Link>
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" mode="icon" aria-label="Buka menu">
                    <Menu className="text-muted-foreground/70" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[275px] gap-0 p-0" side="left" close={false}>
                  <SheetHeader className="space-y-0 px-5 pt-5">
                    <SheetTitle asChild>
                      <div>
                        <Logo />
                      </div>
                    </SheetTitle>
                  </SheetHeader>
                  <SheetBody className="overflow-y-auto p-0">
                    <SidebarMenu />
                  </SheetBody>
                </SheetContent>
              </Sheet>
            </>
          )}
          {!isMobile && <Breadcrumb />}
        </div>
        <div className="flex items-center gap-3">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function Breadcrumb() {
  const { pathname } = useLocation();
  const { hasRole } = useAuth();
  const trail = menuTrail(visibleMenu(MENU, hasRole), pathname);
  if (trail.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.25 text-sm font-medium">
      {trail.map((item, i) => (
        <Fragment key={item.title}>
          <span className={i === trail.length - 1 ? "text-mono" : "text-muted-foreground"}>{item.title}</span>
          {i < trail.length - 1 && <ChevronRight className="size-3.5 text-muted-foreground" />}
        </Fragment>
      ))}
    </nav>
  );
}
