"use client";

import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/actions/auth";

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          CuanQuest
        </Link>
        <div className="flex items-center gap-2">
          <Button size="sm" render={<Link href="/add" />}>
            <Plus className="size-4" /> Tambah
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon" aria-label="Menu" />}
            >
              <Menu className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem render={<Link href="/" />}>Dashboard</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/categories" />}>
                Kantong
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/history" />}>
                Riwayat
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/insights" />}>
                Insight
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/settings" />}>
                Setelan
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem render={<Link href="/admin" />}>
                  Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  void signOut();
                }}
              >
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
