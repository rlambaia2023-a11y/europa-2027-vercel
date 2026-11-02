import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CampoAuth({ id, label, icon: Icon, extra, ...props }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {extra}
      </div>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input id={id} className="pl-10 h-12" required {...props} />
      </div>
    </div>
  );
}

export function ErroAuth({ children }) {
  if (!children) return null;
  return <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{children}</div>;
}
