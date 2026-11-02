import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { KeyRound, Mail, Loader2, MailCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import CampoAuth, { ErroAuth } from "@/components/CampoAuth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
      setEnviado(true);
    } catch (err) {
      setError(err.message || "Não foi possível enviar o e-mail.");
    } finally {
      setLoading(false);
    }
  };

  const voltar = <Link to="/login" className="text-primary font-medium hover:underline">Voltar para o login</Link>;

  if (enviado) {
    return (
      <AuthLayout icon={MailCheck} title="Verifique seu e-mail" subtitle={`Se ${email} tiver conta, chega um link para criar uma nova senha.`} footer={voltar}>
        <p className="text-sm text-muted-foreground">O link vale por pouco tempo. Se não aparecer, olhe a caixa de spam.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={KeyRound} title="Esqueci a senha" subtitle="Enviamos um link para você criar outra" footer={voltar}>
      <ErroAuth>{error}</ErroAuth>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CampoAuth id="email" label="E-mail" icon={Mail} type="email" autoComplete="email" autoFocus
          placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando…</> : "Enviar link"}
        </Button>
      </form>
    </AuthLayout>
  );
}
