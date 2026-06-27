"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { upsertLevel, deleteLevel } from "@/lib/actions/admin";

type LevelRow = {
  level: number;
  xp_required: number;
  title: string;
  badge_icon: string | null;
};

const EMPTY = { level: "", xp_required: "", title: "", badge_icon: "" };

export function LevelEditor({ levels }: { levels: LevelRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [editing, setEditing] = useState<LevelRow | "new" | null>(null);
  const [form, setForm] = useState<{
    level: string;
    xp_required: string;
    title: string;
    badge_icon: string;
  }>(EMPTY);
  const [deleting, setDeleting] = useState<LevelRow | null>(null);

  function openNew() {
    const nextLevel = levels.length
      ? Math.max(...levels.map((l) => l.level)) + 1
      : 1;
    setForm({
      level: String(nextLevel),
      xp_required: "",
      title: "",
      badge_icon: "",
    });
    setEditing("new");
  }

  function openEdit(l: LevelRow) {
    setForm({
      level: String(l.level),
      xp_required: String(l.xp_required),
      title: l.title,
      badge_icon: l.badge_icon ?? "",
    });
    setEditing(l);
  }

  function onSave() {
    if (form.xp_required.trim() === "" && form.level !== "1") {
      toast.error("XP minimal wajib diisi.");
      return;
    }
    startTransition(async () => {
      const res = await upsertLevel({
        level: form.level,
        xp_required: form.xp_required,
        title: form.title.trim(),
        badge_icon: form.badge_icon.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setEditing(null);
      toast.success("Level tersimpan.");
      router.refresh();
    });
  }

  function onDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteLevel(deleting.level);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDeleting(null);
      toast.success("Level dihapus.");
      router.refresh();
    });
  }

  // When editing an existing row, the level number is the primary key — lock it.
  const lockLevel = editing !== "new" && editing !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ambang XP menentukan level semua pengguna. XP = puncak total tabungan
          (mata uang dasar).
        </p>
        <Button size="sm" onClick={openNew}>
          Tambah
        </Button>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Lv</TableHead>
              <TableHead>Judul</TableHead>
              <TableHead className="text-right">XP minimal</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {levels.map((l) => (
              <TableRow key={l.level}>
                <TableCell className="font-medium tabular-nums">
                  {l.level}
                </TableCell>
                <TableCell>
                  {l.badge_icon ? `${l.badge_icon} ` : ""}
                  {l.title}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {l.xp_required.toLocaleString("id-ID")}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(l)}
                  >
                    Ubah
                  </Button>
                  {l.level !== 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleting(l)}
                    >
                      Hapus
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editing === "new" ? "Tambah level" : `Ubah level ${form.level}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-[5rem_1fr] gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="lv-level">Level</Label>
                <Input
                  id="lv-level"
                  inputMode="numeric"
                  value={form.level}
                  disabled={lockLevel}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lv-title">Judul</Label>
                <Input
                  id="lv-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={60}
                  placeholder="mis. Penabung"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lv-xp">XP minimal (mata uang dasar)</Label>
              <Input
                id="lv-xp"
                inputMode="numeric"
                value={form.xp_required}
                onChange={(e) =>
                  setForm({ ...form, xp_required: e.target.value })
                }
                placeholder="1000000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lv-icon">Ikon (opsional)</Label>
              <Input
                id="lv-icon"
                value={form.badge_icon}
                onChange={(e) =>
                  setForm({ ...form, badge_icon: e.target.value })
                }
                maxLength={4}
                placeholder="🏅"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button onClick={onSave} disabled={pending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus level {deleting?.level}?</DialogTitle>
            <DialogDescription>
              Pengguna yang sedang di level ini akan dihitung ulang ke ambang
              terdekat di bawahnya.
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
