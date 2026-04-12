import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/");
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        toast.success("Check your email to confirm your account!");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="gradient-primary px-6 pt-16 pb-12 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <img src="/pyu_go_icon.png" alt="PYU GO" className="w-12 h-12 rounded-xl" />
          <h1 className="text-3xl font-extrabold text-primary-foreground">PYU GO</h1>
        </div>
        <p className="text-primary-foreground/80 text-sm">
          {isLogin ? "Sign in to your account" : "Create a new account"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 pt-8 space-y-5">
        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
        </div>

        <Button type="submit" className="w-full gradient-primary text-primary-foreground font-semibold" size="lg" disabled={loading}>
          {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold">
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </p>

        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 mb-2">Ingin bergabung sebagai mitra?</p>
          <button 
            type="button" 
            onClick={() => navigate("/driver/auth")} 
            className="text-emerald-600 text-sm font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
          >
            Daftar Jadi Driver Partner
          </button>
        </div>
      </form>
    </div>
  );
}
