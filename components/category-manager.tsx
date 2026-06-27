"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/currency";
import {
  createCategory,
  renameCategory,
  deleteCategory,
} from "@/lib/actions/categories";
import type { Category } from "@/lib/types";

type CurrencyOption = { code: string; name: string };

export function CategoryManager({
  categories,
  currencies,
}: {
  categories: Category[];
  currencies: CurrencyOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fallback = currencies[0]?.code ?? "IDR";

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState(fallback);
  const [icon, setIcon] = useState("");

  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [deleting, setDeleting] = useState<Category | null>(null);

  function onCreate() {
    if (!name.trim()) {
      toast.error("Nama kantong wajib diisi.");
      return;
    }
    startTransition(async () => {
      const res = await createCategory({
        name: name.trim(),
        currency,
        icon: icon.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setName("");
      setIcon("");
      toast.success("Kantong dibuat.");
      router.refresh();
    });
  }

  function onRename() {
    if (!editing) return;
    if (!editName.trim()) {
      toast.error("Nama wajib diisi.");
      return;
    }
    startTransition(async () => {
      const res = await renameCategory({
        id: editing.id,
        name: editName.trim(),
        icon: editIcon.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setEditing(null);
      toast.success("Tersimpan.");
      router.refresh();
    });
  }

  function onDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteCategory(deleting.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDeleting(null);
      toast.success("Kantong dihapus.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buat kantong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[1fr_5rem] gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nama</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. Dana Darurat"
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-icon">Ikon</Label>
              <Input
                id="cat-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="💰"
                maxLength={4}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mata uang</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v ?? fallback)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Mata uang tidak bisa diubah setelah kantong terisi.
            </p>
          </div>
          <Button onClick={onCreate} disabled={pending} className="w-full">
            Buat kantong
          </Button>
        </CardContent>
      </Card>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Kantongmu</h3>
        {categories.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Belum ada kantong.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {c.icon ? `${c.icon} ` : ""}
                    {c.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(Number(c.current_balance), c.currency)} ·{" "}
                    {c.currency}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(c);
                      setEditName(c.name);
                      setEditIcon(c.icon ?? "");
                    }}
                  >
                    Ubah
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleting(c)}
                  >
                    Hapus
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah kantong</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nama</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-icon">Ikon</Label>
              <Input
                id="edit-icon"
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                maxLength={4}
                placeholder="💰"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button onClick={onRename} disabled={pending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus kantong?</DialogTitle>
            <DialogDescription>
              Kantong <b>{deleting?.name}</b> dan semua entri-nya dihapus
              permanen. Total tabunganmu menyesuaikan, tapi{" "}
              <b>level tidak turun</b>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={pending}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
