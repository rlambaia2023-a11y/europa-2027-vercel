import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44, supabase } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import CampoAuth, { ErroAuth } from "@/components/CampoAuth";

// O link do e-mail traz uma sessão temporária de recuperação; o Supabase a lê da URL.
export default function ResetPassword() {
  const [pronto, setPronto] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let vivo = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (vivo && sessao && (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN")) setPronto(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!vivo) return;
      if (session) setPronto(true);
      else setTimeout(() => vivo && setPronto((p) => p ?? false), 2500);
    });
    return () => { vivo = false; subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (newPassword !== confirmPassword) return setError("As senhas não conferem.");
    setLoading(true);
    try {
      await base44.auth.resetPassword({ newPassword });
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Não foi possível trocar a senha.");
    } finally {
      setLoading(false);
    }
  };

  const voltar = <Link to="/login" className="text-primary font-medium hover:underline">Voltar para o login</Link>;

  if (pronto === null) {
    return <div className="fixed inset-0 flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  if (!pronto) {
    return (
      <AuthLayout icon={AlertTriangle} title="Link inválido" subtitle="Este link expirou ou já foi usado." footer={voltar}>
        <Link to="/forgot-password"><Button className="w-full h-12">Pedir um novo link</Button></Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={Lock} title="Nova senha" subtitle="Escolha a senha que vai usar daqui pra frente" footer={voltar}>
      <ErroAuth>{error}</ErroAuth>
      <form onSubmit={handleSubmit} className="space-y-4">
        <CampoAuth id="nova" label="Nova senha" icon={Lock} type="password" autoComplete="new-password" autoFocus
          placeholder="Mínimo 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <CampoAuth id="confirma" label="Repita a senha" icon={Lock} type="password" autoComplete="new-password"
          placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : "Salvar senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}
