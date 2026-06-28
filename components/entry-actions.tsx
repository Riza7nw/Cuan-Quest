"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteEntry, updateEntry } from "@/lib/actions/entries";
import type { EntryType } from "@/lib/types";

type Props = {
  id: string;
  type: EntryType;
  amount: number;
  note: string | null;
  occurredAt: string;
  currency: string;
};

// ISO -> value for <input type="datetime-local"> in the user's local time.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function EntryActions({ id, type, amount, note, occurredAt, currency }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [amountStr, setAmountStr] = useState(String(amount));
  const [noteStr, setNoteStr] = useState(note ?? "");
  const [dateStr, setDateStr] = useState(toLocalInput(occurredAt));

  const isTransfer = type === "transfer";

  function onSave() {
    const amt = Number(amountStr.replace(",", ".").replace(/[^0-9.]/g, ""));
    if (!isTransfer && !(amt > 0)) {
      toast.error("Jumlah harus lebih dari 0.");
      return;
    }
    startTransition(async () => {
      const res = await updateEntry({
        id,
        amount: isTransfer ? null : amt,
        note: noteStr.trim() ? noteStr.trim() : null,
        occurred_at: dateStr ? new Date(dateStr) : undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setEditing(false);
      toast.success("Entri diperbarui.");
      router.refresh();
    });
  }

  function onDelete() {
    startTransition(async () => {
      const res = await deleteEntry(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDeleting(false);
      toast.success("Entri dihapus.");
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              aria-label="Aksi entri"
            />
          }
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ⋯
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => setEditing(true)}>Ubah</DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleting(true)}
          >
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editing} onOpenChange={(o) => !o && setEditing(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah entri</DialogTitle>
            {isTransfer && (
              <DialogDescription>
                Pindah hanya bisa ubah catatan & tanggal (jumlah dikunci agar kurs
                tetap konsisten).
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3">
            {!isTransfer && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-amount">Jumlah ({currency})</Label>
                <Input
                  id="edit-amount"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="edit-note">Catatan</Label>
              <Input
                id="edit-note"
                value={noteStr}
                onChange={(e) => setNoteStr(e.target.value)}
                maxLength={280}
                placeholder="Opsional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-date">Tanggal</Label>
              <Input
                id="edit-date"
                type="datetime-local"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Batal
            </Button>
            <Button onClick={onSave} disabled={pending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting} onOpenChange={(o) => !o && setDeleting(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus entri?</DialogTitle>
            <DialogDescription>
              Saldo kantong menyesuaikan. Level tidak turun (puncak XP permanen).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={pending}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
