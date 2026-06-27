import { AuthForm } from "@/components/auth-form";
import { signIn } from "@/lib/actions/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">CuanQuest</h1>
        <p className="text-sm text-muted-foreground">Wealth RPG · naik level dengan menabung</p>
      </div>
      <AuthForm mode="login" action={signIn} />
    </main>
  );
}
