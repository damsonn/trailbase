import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { NavBar } from "./components/NavBar.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { LoginPage } from "./pages/LoginPage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage.js";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { RoutesPage } from "./pages/RoutesPage.js";
import { RouteDetailPage } from "./pages/RouteDetailPage.js";

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

function AppLayout() {
  const { pathname } = useLocation();
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800">
      {!isAuthPage && <NavBar />}
      <main>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/routes"
              element={
                <ProtectedRoute>
                  <RoutesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/routes/:id"
              element={
                <ProtectedRoute>
                  <RouteDetailPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
