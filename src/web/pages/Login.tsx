import { useState, type FormEvent } from "react";
import { ClipboardCheck, Eye, EyeOff, LoaderCircle, Package, Wrench } from "lucide-react";
import { useAuth } from "../auth";
import { ErrorAlert, errorText, Field } from "../components/common";
import { Logo } from "../components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const HIGHLIGHTS = [
  { icon: Package, text: "Data aset dan kondisinya dalam satu tempat" },
  { icon: Wrench, text: "Laporan kerusakan langsung diteruskan ke teknisi" },
  { icon: ClipboardCheck, text: "Jadwal pemeliharaan rutin yang terpantau" },
];

/** Metronic's "branded" sign-in layout: form card on one side, illustration panel on the other. */
export function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await login(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <div className="grid grow lg:grid-cols-2">
      <div className="order-2 flex items-center justify-center p-8 lg:order-1 lg:p-10">
        <Card className="w-full max-w-[400px]">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="block w-full space-y-5">
              <div className="space-y-1 pb-3 text-center">
                <h1 className="text-2xl font-semibold tracking-tight text-mono">Masuk</h1>
                <p className="text-sm text-muted-foreground">Selamat datang kembali! Masuk dengan akun Anda.</p>
              </div>

              {error && <ErrorAlert>{error}</ErrorAlert>}

              <Field label="Email" htmlFor="email">
                <Input id="email" name="email" type="email" placeholder="nama@kantor.id" autoComplete="username" required autoFocus />
              </Field>

              <Field label="Password" htmlFor="password">
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password Anda"
                    autoComplete="current-password"
                    required
                    className="pe-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    mode="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    className="absolute end-0 top-0 h-full px-3 hover:bg-transparent"
                  >
                    {showPassword ? (
                      <EyeOff className="text-muted-foreground" />
                    ) : (
                      <Eye className="text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </Field>

              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy && <LoaderCircle className="animate-spin" />}
                Masuk
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Belum punya akun? Hubungi Administrator untuk dibuatkan.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="auth-panel order-1 lg:order-2 lg:m-5 lg:rounded-xl">
        <div className="flex h-full flex-col gap-6 p-8 lg:justify-center lg:p-16">
          <Logo inverted />
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold text-white lg:text-3xl">Manajemen Aset & Laporan Kerusakan</h2>
            <p className="max-w-md text-base text-blue-100">
              Pantau kondisi aset, laporkan kerusakan, dan tindak lanjuti perbaikan dengan cepat.
            </p>
          </div>
          <ul className="hidden flex-col gap-4 lg:flex">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-medium text-white">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
                  <Icon className="size-4.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
