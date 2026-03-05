import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NavBar } from "./components/NavBar.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { LoginPage } from "./pages/LoginPage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage.js";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-50 text-neutral-800">
        <NavBar />
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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
