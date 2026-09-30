import { DadosProvider } from "@/components/app/dados";
import { AvisosProvider } from "@/components/ui/aviso";

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <AvisosProvider>
      <DadosProvider>{children}</DadosProvider>
    </AvisosProvider>
  );
}
