import type { ReactNode } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function Confirmar({ open, onOpenChange, titulo, children, acao, onConfirm, perigo }: { open: boolean; onOpenChange: (o: boolean) => void; titulo: string; children: ReactNode; acao: string; onConfirm: () => void; perigo?: boolean }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription asChild><div>{children}</div></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={perigo ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}>{acao}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
