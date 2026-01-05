import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo-stmik-praya.png" alt="Logo Kampus" className="h-10 w-10 object-contain" />
          <div>
            <div className="font-bold text-slate-900 leading-tight">Sistem Peminjaman Ruangan</div>
            <div className="text-xs text-slate-500">Realtime booking • Approval admin • Surat PDF</div>
          </div>
        </div>

        <nav className="flex items-center gap-6 text-sm">
          <Link to="/schedule" className="hover:underline">Jadwal</Link>

          {user ? (
            <>
              <Link to={(user?.role === "ADMIN") ? "/admin" : "/dashboard"} className="hover:underline">Dashboard</Link>
              <button onClick={onLogout} className="hover:underline">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:underline">Login</Link>
              <Link to="/register" className="hover:underline">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
