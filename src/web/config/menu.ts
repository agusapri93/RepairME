import { Database, LayoutDashboard, Package, Users, Wrench, type LucideIcon } from "lucide-react";
import type { Role } from "../../shared/constants";

export type MenuItem = {
  title: string;
  path?: string;
  icon?: LucideIcon;
  /** Only these roles see the item; everyone sees it when omitted. */
  roles?: Role[];
  children?: MenuItem[];
};

export const MENU: MenuItem[] = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Aset", path: "/assets", icon: Package },
  { title: "Laporan Kerusakan", path: "/reports", icon: Wrench },
  {
    title: "Master Data",
    icon: Database,
    roles: ["administrator"],
    children: [
      { title: "Kategori Aset", path: "/master/categories" },
      { title: "Gedung", path: "/master/buildings" },
    ],
  },
  { title: "User Management", path: "/users", icon: Users, roles: ["administrator"] },
];

export function visibleMenu(items: MenuItem[], hasRole: (...roles: Role[]) => boolean): MenuItem[] {
  return items
    .filter((item) => !item.roles || hasRole(...item.roles))
    .map((item) => (item.children ? { ...item, children: visibleMenu(item.children, hasRole) } : item));
}

export function isActivePath(path: string, pathname: string) {
  return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
}

/** The chain of menu items leading to the current page, for breadcrumbs. */
export function menuTrail(items: MenuItem[], pathname: string): MenuItem[] {
  for (const item of items) {
    if (item.path && isActivePath(item.path, pathname)) return [item];
    if (item.children) {
      const trail = menuTrail(item.children, pathname);
      if (trail.length) return [item, ...trail];
    }
  }
  return [];
}
