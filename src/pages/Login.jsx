import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import CampoAuth, { ErroAuth } from "@/components/CampoAuth";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const returnTo = safeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "E-mail ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Europa 2027"
      subtitle="Entre para ver o roteiro da viagem"
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")} className="text-primary font-medium hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <ErroAuth>{error}</ErroAuth>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CampoAuth id="email" label="E-mail" icon={Mail} type="email" autoComplete="email" autoFocus
          placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <CampoAuth id="password" label="Senha" icon={Lock} type="password" autoComplete="current-password"
          placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
          extra={<Link to="/forgot-password" className="text-xs text-primary hover:underline">Esqueci a senha</Link>} />
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando…</> : "Entrar"}
        </Button>
      </form>
    </AuthLayout>
  );
}
