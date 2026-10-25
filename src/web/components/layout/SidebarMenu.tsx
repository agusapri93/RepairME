import { useCallback } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../../auth";
import { isActivePath, MENU, visibleMenu, type MenuItem } from "../../config/menu";
import {
  AccordionMenu,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
  type AccordionMenuClassNames,
} from "@/components/ui/accordion-menu";

// Same styling as Metronic's demo1 sidebar.
const classNames: AccordionMenuClassNames = {
  root: "lg:ps-1 space-y-3",
  group: "gap-px",
  label: "uppercase text-xs font-medium text-muted-foreground/70 pt-2.25 pb-px",
  separator: "",
  item: "h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-muted data-[selected=true]:font-medium",
  sub: "",
  subTrigger:
    "h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-muted data-[selected=true]:font-medium",
  subContent: "py-0",
  indicator: "",
};

export function SidebarMenu() {
  const { pathname } = useLocation();
  const { hasRole } = useAuth();
  const matchPath = useCallback((path: string) => isActivePath(path, pathname), [pathname]);

  // Items are built with plain functions rather than components on purpose: AccordionMenu
  // walks its children's props to find (and expand) the active item, and can't see
  // through custom components.
  return (
    <div className="kt-scrollable-y-hover flex grow shrink-0 px-5 py-5 lg:max-h-[calc(100vh-5.5rem)]">
      <AccordionMenu selectedValue={pathname} matchPath={matchPath} type="single" collapsible classNames={classNames}>
        {visibleMenu(MENU, hasRole).map((item) => (item.children ? subMenu(item) : menuItem(item)))}
      </AccordionMenu>
    </div>
  );
}

function menuItem(item: MenuItem) {
  return (
    <AccordionMenuItem key={item.title} value={item.path ?? ""} className="text-sm font-medium">
      <Link to={item.path ?? "#"} className="flex grow items-center gap-2">
        {item.icon && <item.icon data-slot="accordion-menu-icon" />}
        <span data-slot="accordion-menu-title">{item.title}</span>
      </Link>
    </AccordionMenuItem>
  );
}

function subMenu(item: MenuItem) {
  const value = `group-${item.title}`;
  return (
    <AccordionMenuSub key={item.title} value={value}>
      <AccordionMenuSubTrigger className="text-sm font-medium">
        {item.icon && <item.icon data-slot="accordion-menu-icon" />}
        <span data-slot="accordion-menu-title">{item.title}</span>
      </AccordionMenuSubTrigger>
      <AccordionMenuSubContent type="single" collapsible parentValue={value} className="ps-6">
        <AccordionMenuGroup>
          {item.children?.map((child) => (
            <AccordionMenuItem key={child.title} value={child.path ?? ""} className="text-[13px]">
              <Link to={child.path ?? "#"}>{child.title}</Link>
            </AccordionMenuItem>
          ))}
        </AccordionMenuGroup>
      </AccordionMenuSubContent>
    </AccordionMenuSub>
  );
}
