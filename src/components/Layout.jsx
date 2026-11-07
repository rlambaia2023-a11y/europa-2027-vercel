import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass, CalendarDays, Map, BedDouble, Wallet,
  FileCheck, CloudSun, BookOpen, Settings, Menu, X, Plane, Sparkles,
  Camera, Luggage,
} from "lucide-react";
import { cn } from "@/lib/utils";
import OfflineBanner from "@/components/OfflineBanner";
import { usePermissao } from "@/lib/usePermissao";
import AnexarGlobal from "@/components/reservas/AnexarGlobal";

const NAV = [
  { to: "/", label: "Início", icon: Compass, end: true },
  { to: "/itinerario", label: "Itinerário", icon: CalendarDays },
  { to: "/mapa", label: "Mapa", icon: Map },
  { to: "/reservas", label: "Reservas", icon: BedDouble },
  { to: "/orcamento", label: "Orçamento", icon: Wallet },
  { to: "/documentos", label: "Documentos", icon: FileCheck },
  { to: "/clima", label: "Clima", icon: CloudSun },
  { to: "/diario", label: "Diário", icon: BookOpen },
  { to: "/album", label: "Álbum HMAA", icon: Camera },
  { to: "/sugestoes", label: "Sugestões", icon: Sparkles },
  { to: "/bagagem", label: "Bagagem", icon: Luggage },
  { to: "/admin", label: "Admin", icon: Settings, soOrganizador: true },
];

const NAV_MOBILE = NAV.slice(0, 4);

export default function Layout() {
  const [maisAberto, setMaisAberto] = useState(false);
  const location = useLocation();
  const { organizador } = usePermissao();
  const nav = NAV.filter((item) => !item.soOrganizador || organizador);

  useEffect(() => { setMaisAberto(false); }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-card">
        <div className="px-6 py-7 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-soft">
              <Plane className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading text-[15px] leading-tight text-primary font-semibold">Europa 2027</p>
              <p className="text-[11px] text-muted-foreground tracking-wide uppercase">Viagem em Família</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-border">
          <p className="text-[11px] text-muted-foreground">24 mar – 5 abr 2027</p>
          <p className="text-[11px] text-muted-foreground">4 viajantes · 4 países</p>

        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-card/90 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Plane className="w-4 h-4 text-primary-foreground" />
          </div>
          <p className="font-heading text-sm font-semibold text-primary">Europa 2027</p>
        </div>
        <button
          onClick={() => setMaisAberto(true)}
          className="p-2 -mr-2 text-foreground"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Drawer mobile "Mais" */}
      <AnimatePresence>
        {maisAberto && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMaisAberto(false)}
            />
            <motion.aside
              className="lg:hidden fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-card shadow-card flex flex-col"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-border">
                <p className="font-heading text-sm font-semibold text-primary">Menu</p>
                <button onClick={() => setMaisAberto(false)} className="p-2 -mr-2" aria-label="Fechar">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {nav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <item.icon className="w-[18px] h-[18px]" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Conteúdo */}
      <main className="lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-10 py-6 pb-28 lg:pb-10 max-w-6xl mx-auto">
          <OfflineBanner />
          <Suspense fallback={<div className="flex justify-center py-20"><div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" /></div>}>
            <Outlet />
          </Suspense>
        </div>
        <footer className="px-4 sm:px-6 lg:px-10 pb-8 lg:pb-8 max-w-6xl mx-auto">
          <div className="border-t border-border pt-5 text-center">
            <p className="text-[11px] text-muted-foreground tracking-wide">
              Este sistema foi criado por Harrison, Mayara, Anna Luiza e Alessandra Miranda. © 2027
            </p>
          </div>
        </footer>
      </main>

      {/* Anexar reservas: disponível em todas as telas */}
      <AnexarGlobal />

      {/* Bottom nav mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border">
        <div className="grid grid-cols-5">
          {NAV_MOBILE.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                isActive ? "text-accent" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={() => setMaisAberto(true)}
            className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground"
          >
            <Menu className="w-5 h-5" />
            Mais
          </button>
        </div>
      </nav>
    </div>
  );
}