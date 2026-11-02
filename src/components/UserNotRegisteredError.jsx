import { Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Conta criada, mas o organizador ainda não ligou a pessoa a um viajante.
export default function UserNotRegisteredError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-sm border border-border p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/15 mb-4">
          <Clock className="w-7 h-7 text-accent" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-2xl font-semibold text-primary">Aguardando liberação</h1>
        <p className="text-sm text-muted-foreground mt-3">
          Sua conta foi criada. Peça ao organizador da viagem para ligar seu nome a ela na área de Admin.
          Depois disso, é só entrar de novo.
        </p>
        <div className="mt-6 flex gap-2 justify-center">
          <button onClick={() => window.location.reload()}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            Já fui liberado
          </button>
          <button onClick={() => base44.auth.logout("/login")}
            className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:border-accent">
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
