"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AuthState } from "@/lib/actions/auth";

type Props = {
  mode: "login" | "signup";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
};

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {}
  );
  const isLogin = mode === "login";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">{isLogin ? "Masuk" : "Daftar"}</CardTitle>
        <CardDescription>
          {isLogin
            ? "Lanjutkan quest tabunganmu."
            : "Mulai dari nol — naik level dengan menabung."}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="kamu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata sandi</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state.message && (
            <p className="text-sm text-emerald-600">{state.message}</p>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Memproses…" : isLogin ? "Masuk" : "Daftar"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
            <Link
              href={isLogin ? "/signup" : "/login"}
              className="font-medium underline underline-offset-4"
            >
              {isLogin ? "Daftar" : "Masuk"}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
