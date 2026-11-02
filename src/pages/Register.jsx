import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { UserPlus, Mail, Lock, User, Loader2, MailCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import CampoAuth, { ErroAuth } from "@/components/CampoAuth";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Register() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const returnTo = safeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirmPassword) return setError("As senhas não conferem.");
    setLoading(true);
    try {
      const res = await base44.auth.register({ email, password, full_name: nome.trim() });
      if (res?.session) window.location.href = returnTo;
      else setEnviado(true);
    } catch (err) {
      setError(err.message || "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <AuthLayout icon={MailCheck} title="Confirme seu e-mail" subtitle={`Enviamos um link para ${email}`}
        footer={<Link to="/login" className="text-primary font-medium hover:underline">Voltar para o login</Link>}>
        <p className="text-sm text-muted-foreground">
          Abra o e-mail e toque no link de confirmação. Depois entre com seu e-mail e senha.
          O organizador da viagem ainda precisa liberar sua conta antes de você ver o roteiro.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Criar conta"
      subtitle="Para acompanhar a Europa 2027"
      footer={
        <>
          Já tem conta?{" "}
          <Link to={"/login" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")} className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <ErroAuth>{error}</ErroAuth>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CampoAuth id="nome" label="Seu nome" icon={User} autoComplete="name" autoFocus
          placeholder="Como a família te chama" value={nome} onChange={(e) => setNome(e.target.value)} />
        <CampoAuth id="email" label="E-mail" icon={Mail} type="email" autoComplete="email"
          placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <CampoAuth id="password" label="Senha" icon={Lock} type="password" autoComplete="new-password"
          placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} />
        <CampoAuth id="confirm" label="Repita a senha" icon={Lock} type="password" autoComplete="new-password"
          placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando…</> : "Criar conta"}
        </Button>
      </form>
    </AuthLayout>
  );
}
