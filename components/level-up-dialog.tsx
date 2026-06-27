"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: number;
  title: string | null;
};

export function LevelUpDialog({ open, onOpenChange, level, title }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-center sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">🎉 Naik Level!</DialogTitle>
          <DialogDescription className="text-center">
            Tabunganmu menembus level baru. Terus jaga momentumnya.
          </DialogDescription>
        </DialogHeader>
        <div className="my-2 flex flex-col items-center gap-2">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/15 text-4xl font-black text-primary animate-in zoom-in-50">
            {level}
          </div>
          <p className="text-lg font-bold">{title ?? `Level ${level}`}</p>
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Lanjut quest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
