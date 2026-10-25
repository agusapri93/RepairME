import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ArrowLeft, ChevronsUpDown, CircleAlert, Inbox, LoaderCircle, Search, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import {
  ASSET_CONDITION_LABELS,
  MAINTENANCE_DUE_SOON_DAYS,
  REPORT_PRIORITY_LABELS,
  REPORT_STATUS_LABELS,
  type AssetCondition,
  type ReportPriority,
  type ReportStatus,
} from "../../shared/constants";
import { cn } from "@/lib/utils";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// ---------- Formatting ----------

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

/** Empty strings become null so optional columns are cleared instead of stored as "". */
export function orNull(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function errorText(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

// ---------- Layout ----------

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1320px] px-4 lg:px-6", className)}>{children}</div>;
}

/** Page title row in Metronic's toolbar style, with optional back link and actions. */
export function PageToolbar({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-5 pb-7.5">
      <div className="flex flex-col justify-center gap-2">
        {back && (
          <Link
            to={back.to}
            className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            {back.label}
          </Link>
        )}
        <h1 className="text-xl font-medium leading-none text-mono">{title}</h1>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function InfoList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
          <dd className="text-sm text-mono">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ---------- Status ----------

type BadgeVariant = "primary" | "secondary" | "success" | "warning" | "info" | "destructive";

const conditionVariant: Record<AssetCondition, BadgeVariant> = {
  baik: "success",
  rusak_ringan: "warning",
  rusak_berat: "destructive",
};
const statusVariant: Record<ReportStatus, BadgeVariant> = {
  dilaporkan: "primary",
  diproses: "warning",
  selesai: "success",
  ditolak: "secondary",
};
const priorityVariant: Record<ReportPriority, BadgeVariant> = {
  rendah: "secondary",
  sedang: "info",
  tinggi: "destructive",
};

export function StatusDot({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return (
    <Badge variant={variant} appearance="light" size="md" className="gap-1.5">
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </Badge>
  );
}

/** How close a maintenance due date is, from `daysLeft` (negative = overdue). */
export function DueBadge({ daysLeft }: { daysLeft: number }) {
  if (daysLeft < 0) return <StatusDot variant="destructive">Terlambat {-daysLeft} hari</StatusDot>;
  if (daysLeft <= MAINTENANCE_DUE_SOON_DAYS) {
    return <StatusDot variant="warning">{daysLeft === 0 ? "Hari ini" : `${daysLeft} hari lagi`}</StatusDot>;
  }
  return <StatusDot variant="secondary">{daysLeft} hari lagi</StatusDot>;
}

export function ConditionBadge({ value }: { value: AssetCondition }) {
  return <StatusDot variant={conditionVariant[value]}>{ASSET_CONDITION_LABELS[value]}</StatusDot>;
}

export function StatusBadge({ value }: { value: ReportStatus }) {
  return <StatusDot variant={statusVariant[value]}>{REPORT_STATUS_LABELS[value]}</StatusDot>;
}

export function PriorityBadge({ value }: { value: ReportPriority }) {
  return (
    <Badge variant={priorityVariant[value]} appearance="outline" size="md">
      {REPORT_PRIORITY_LABELS[value]}
    </Badge>
  );
}

// ---------- Data states ----------

export function ErrorAlert({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Alert variant="destructive" appearance="light" className={className}>
      <AlertIcon>
        <CircleAlert />
      </AlertIcon>
      <AlertTitle>{children}</AlertTitle>
    </Alert>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-mono">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

/** Shows a skeleton while loading, an error alert on failure, otherwise the content. */
export function Loader<T>({
  state,
  skeleton = <CardSkeleton />,
  children,
}: {
  state: { data: T | null; error: string | null };
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (state.error) return <ErrorAlert>{state.error}</ErrorAlert>;
  if (!state.data) return <>{skeleton}</>;
  return <>{children(state.data)}</>;
}

// ---------- Mobile list (tables collapse into this below the md breakpoint) ----------

export function MobileList({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-border border-t border-border md:hidden">{children}</ul>;
}

export function MobileListItem({
  to,
  title,
  subtitle,
  badges,
  aside,
}: {
  to?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  aside?: ReactNode;
}) {
  const body = (
    <>
      <div className="flex min-w-0 grow flex-col gap-1">
        <span className="text-sm font-medium text-mono">{title}</span>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        {badges && <span className="mt-1 flex flex-wrap items-center gap-1.5">{badges}</span>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </>
  );
  return (
    <li>
      {to ? (
        <Link to={to} className="flex items-start gap-3 px-5 py-3.5 transition-colors active:bg-muted/60">
          {body}
        </Link>
      ) : (
        <div className="flex items-start gap-3 px-5 py-3.5">{body}</div>
      )}
    </li>
  );
}

// ---------- Table toolbar ----------

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:w-64", className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="ps-9"
      />
    </div>
  );
}

const ALL = "__all__";

/** A filter dropdown whose first option means "no filter" (`null`). */
export function FilterSelect<T extends string>({
  value,
  onChange,
  allLabel,
  options,
  className,
}: {
  value: T | null;
  onChange: (value: T | null) => void;
  allLabel: string;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : (v as T))}>
      <SelectTrigger className={cn("w-full sm:w-44", className)} aria-label={allLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------- Forms ----------

export function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ms-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Radix Select that also submits through FormData (Radix renders a hidden native select
 * when `name` is set), so it works inside {@link FormDialog} like a plain input.
 */
export function SelectField({
  name,
  options,
  defaultValue,
  placeholder = "Pilih…",
  required,
  disabled,
  id,
}: {
  name: string;
  options: { value: string; label: ReactNode }[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <Select name={name} defaultValue={defaultValue || undefined} required={required} disabled={disabled}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type ComboboxOption = {
  value: string;
  label: string;
  /** Secondary text shown beside the label and matched by search (e.g. a code). */
  description?: string;
};

/**
 * A searchable dropdown. Like {@link SelectField} it submits through FormData (via a hidden
 * input named `name`) and supports `required`; pass `value`/`onValueChange` to control it.
 */
export function ComboboxField({
  id,
  name,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Pilih…",
  searchPlaceholder = "Cari…",
  emptyText = "Tidak ada yang cocok.",
  required,
  disabled,
}: {
  id?: string;
  name?: string;
  options: ComboboxOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;
  const selected = options.find((o) => o.value === current);
  const trigger = useRef<HTMLButtonElement>(null);

  function select(next: string) {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={trigger}
            id={id}
            type="button"
            variant="outline"
            mode="input"
            placeholder={!selected}
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full"
          >
            <span className="truncate">
              {selected ? (
                <>
                  {selected.label}
                  {selected.description && (
                    <span className="ms-1.5 font-mono text-xs text-muted-foreground">{selected.description}</span>
                  )}
                </>
              ) : (
                placeholder
              )}
            </span>
            <ChevronsUpDown className="ms-auto size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-56 p-0" align="start">
          {/* Match on label and description only, not on the (often numeric) value. */}
          <Command
            filter={(_, search, keywords) =>
              (keywords ?? []).join(" ").toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={o.value}
                    keywords={[o.label, o.description ?? ""]}
                    onSelect={() => select(o.value)}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.description && <span className="font-mono text-xs text-muted-foreground">{o.description}</span>}
                    {o.value === current && <CommandCheck />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {name && (
        // Invisible but not display:none, so the browser still validates `required` on it.
        <input
          tabIndex={-1}
          aria-hidden
          name={name}
          value={current}
          required={required}
          disabled={disabled}
          onChange={() => {}}
          onFocus={() => trigger.current?.focus()}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
        />
      )}
    </div>
  );
}

/**
 * A dialog wrapping a form. `onSubmit` receives the form values as a plain object; while it
 * runs the submit button shows a spinner, and a thrown error is shown inside the dialog.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "Simpan",
  onSubmit,
  children,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className={cn("p-0 gap-0", size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <form onSubmit={handleSubmit} className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <DialogBody className="flex flex-col gap-5 overflow-y-auto px-5 py-5">
            {error && <ErrorAlert>{error}</ErrorAlert>}
            {children}
          </DialogBody>
          <DialogFooter className="border-t border-border px-5 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <LoaderCircle className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Confirm dialog ----------

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
};

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Replaces window.confirm with a themed dialog: `if (await confirm({...})) ...`. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function settle(ok: boolean) {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }

  return (
    <ConfirmContext value={confirm}>
      {children}
      <AlertDialog open={!!options} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant={options?.destructive ? "destructive" : "primary"}
              onClick={() => settle(true)}
            >
              {options?.confirmLabel ?? "Ya, lanjutkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return confirm;
}
