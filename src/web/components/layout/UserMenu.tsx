import { LogOut, Moon } from "lucide-react";
import { ROLE_LABELS } from "../../../shared/constants";
import { useAuth, useUser } from "../../auth";
import { useTheme } from "../../theme";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function UserAvatar({ name, className = "size-9" }: { name: string; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ${className}`}
    >
      {initials(name)}
    </span>
  );
}

export function UserMenu() {
  const user = useUser();
  const { logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="cursor-pointer rounded-full" aria-label="Menu akun">
          <UserAvatar name={user.name} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" side="bottom" align="end">
        <div className="flex items-center gap-2.5 p-3">
          <UserAvatar name={user.name} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-mono">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
        <div className="px-3 pb-2">
          <Badge variant="primary" appearance="light" size="sm">
            {ROLE_LABELS[user.role]}
          </Badge>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2"
          onSelect={(e) => {
            e.preventDefault();
            setTheme(resolvedTheme === "dark" ? "light" : "dark");
          }}
        >
          <Moon />
          <div className="flex grow items-center justify-between gap-2">
            Mode Gelap
            <Switch size="sm" checked={resolvedTheme === "dark"} />
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center gap-2" onSelect={() => void logout()}>
          <LogOut />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
