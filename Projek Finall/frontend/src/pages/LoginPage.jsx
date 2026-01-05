import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { saveAuth } from "../lib/auth";
import Header from "../components/Header";

export default function LoginPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await api.post("/api/auth/login", form);
      saveAuth(data);
      window.dispatchEvent(new Event("auth-changed"));
      if (data.user.role === "ADMIN") nav("/admin");
      else nav("/dashboard");
    } catch (e) {
      setErr(e?.response?.data?.message || "Login gagal");
    }
  };

  return (
    <>
      <Header />
      <main className="max-w-md mx-auto px-4 py-10">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Login</h1>
          <p className="text-sm text-slate-500">Masuk sebagai Admin / Dosen / Mahasiswa</p>

          {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

          <form onSubmit={submit} className="mt-5 space-y-3">
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <button className="w-full bg-slate-900 text-white rounded-lg py-2 hover:opacity-95">
              Login
            </button>
          </form>

          <div className="mt-4 text-sm text-slate-600">
            Belum punya akun mahasiswa? <Link className="underline" to="/register">Register</Link>
          </div>

          <div className="mt-6 text-xs text-slate-500">
            Akun dummy: admin/Admin123 • mhs_andi/Mhs123
          </div>
        </div>
      </main>
    </>
  );
}
