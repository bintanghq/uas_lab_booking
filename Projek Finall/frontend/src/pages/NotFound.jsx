import Header from "../components/Header";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h1 className="text-xl font-semibold">404</h1>
          <p className="text-slate-600 mt-2">Halaman tidak ditemukan.</p>
          <Link className="underline mt-4 inline-block" to="/login">Kembali</Link>
        </div>
      </main>
    </>
  );
}
