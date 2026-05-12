import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import campusImgDefault from "@/assets/cnci-pharmacy-gate.png";
import { useSettingsStore } from "@/stores/settingsStore";
import cnciLogo from "@/assets/cnci-logo-official.png";

export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, users, isLoading, lastSynced } = useAuthStore();
  const { loginBgImage } = useSettingsStore();
  const campusImg = loginBgImage || campusImgDefault;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Debug: log available users
    console.log("Available users for login:", users.map(u => ({ name: u.name, password: u.password, isActive: u.isActive })));
    console.log("Attempting login with:", name, password);
    
    const success = login(name, password);
    if (success) {
      navigate("/dashboard");
    } else {
      setError("Invalid credentials. Please check your name and password.");
    }
  };

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex lg:w-3/5 relative items-end p-10"
        style={{ backgroundImage: `url(${campusImg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/95 via-navy-deep/60 to-navy-deep/20" />
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-3 mb-5">
            <img src={cnciLogo} alt="CNCI" className="size-16 rounded-xl bg-white/90 p-1.5 shadow-lg" />
            <div>
              <span className="text-[10px] font-semibold text-gold uppercase tracking-widest block">Government of India</span>
              <h1 className="font-display text-3xl font-bold text-white leading-tight">
                Chittaranjan National Cancer Institute
              </h1>
            </div>
          </div>
          <p className="text-white/70 text-sm leading-relaxed mb-6">
            Workflow management for task tracking, file numbering, tender management, and contract monitoring across Hazra and New Town campuses.
          </p>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gold tabular-nums">2</p>
              <p className="text-xs text-white/50">Campuses</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gold tabular-nums">5</p>
              <p className="text-xs text-white/50">Team Members</p>
            </div>
            <div className="w-px bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-gold tabular-nums">∞</p>
              <p className="text-xs text-white/50">Files Tracked</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url(${campusImg})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(20px)" }} />
        <div className="w-full max-w-sm relative z-10">
          <div className="flex flex-col items-center gap-4 mb-8">
            <img src={cnciLogo} alt="CNCI" className="size-20 rounded-2xl shadow-lg bg-white p-2 lg:hidden" />
            <div className="text-center">
              <h2 className="text-2xl font-display font-bold text-foreground tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                Store <span className="text-gold">&</span> Purchase Manager
              </h2>
              <p className="text-xs text-muted-foreground mt-1">CNCI — TO (Store & Purchase)</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/60">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="pl-10 h-11 bg-white/70 border-gray-200 focus:border-gold focus:ring-gold/20"
                    list="user-names"
                    required
                  />
                  <datalist id="user-names">
                    {users.filter((u) => u.isActive).map((u) => (
                      <option key={u.id} value={u.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 h-11 bg-white/70 border-gray-200 focus:border-gold focus:ring-gold/20"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
              )}

              {isLoading && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Loading users from Google Sheets...
                </div>
              )}

              <Button type="submit" className="w-full h-11 gold-gradient text-white border-0 font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg" disabled={isLoading}>
                Sign In
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Contact TO (S&P) for account access
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
