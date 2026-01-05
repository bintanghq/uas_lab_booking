import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import Header from "../components/Header";

export default function RegisterPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");
    try {
      await api.post("/api/auth/register", form);
      setOk("Registrasi berhasil. Silakan login.");
      setTimeout(() => nav("/login"), 700);
    } catch (e) {
      setErr(e?.response?.data?.message || "Registrasi gagal");
    }
  };

  return (
    <>
      <Header />
      <main className="max-w-md mx-auto px-4 py-10">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Register Mahasiswa</h1>
          <p className="text-sm text-slate-500">Buat akun untuk booking ruangan</p>

          {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
          {ok && <div className="mt-3 text-sm text-green-600">{ok}</div>}

          <form onSubmit={submit} className="mt-5 space-y-3">
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Nama"
              value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})}/>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Username"
              value={form.username} onChange={(e)=>setForm({...form, username:e.target.value})}/>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Email (opsional)"
              value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})}/>
            <input className="w-full border rounded-lg px-3 py-2" placeholder="Password" type="password"
              value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})}/>
            <button className="w-full bg-slate-900 text-white rounded-lg py-2 hover:opacity-95">
              Register
            </button>
          </form>

          <div className="mt-4 text-sm text-slate-600">
            Sudah punya akun? <Link className="underline" to="/login">Login</Link>
          </div>
        </div>
      </main>
    </>
  );
}
