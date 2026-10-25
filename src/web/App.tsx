import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import type { Role } from "../shared/constants";
import { AuthProvider, useAuth } from "./auth";
import { AppLayout } from "./components/layout/AppLayout";
import { AssetDetailPage } from "./pages/AssetDetail";
import { AssetsPage } from "./pages/Assets";
import { BuildingDetailPage } from "./pages/BuildingDetail";
import { BuildingsPage } from "./pages/Buildings";
import { CategoriesPage } from "./pages/Categories";
import { DashboardPage } from "./pages/Dashboard";
import { LoginPage } from "./pages/Login";
import { ReportDetailPage } from "./pages/ReportDetail";
import { ReportsPage } from "./pages/Reports";
import { UsersPage } from "./pages/Users";

function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { hasRole } = useAuth();
  return hasRole(...roles) ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex grow items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-primary" aria-label="Memuat" />
      </div>
    );
  }
  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="assets/:id" element={<AssetDetailPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/:id" element={<ReportDetailPage />} />
        <Route
          path="master/categories"
          element={
            <RequireRole roles={["administrator"]}>
              <CategoriesPage />
            </RequireRole>
          }
        />
        <Route
          path="master/buildings"
          element={
            <RequireRole roles={["administrator"]}>
              <BuildingsPage />
            </RequireRole>
          }
        />
        <Route
          path="master/buildings/:id"
          element={
            <RequireRole roles={["administrator"]}>
              <BuildingDetailPage />
            </RequireRole>
          }
        />
        <Route
          path="users"
          element={
            <RequireRole roles={["administrator"]}>
              <UsersPage />
            </RequireRole>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
