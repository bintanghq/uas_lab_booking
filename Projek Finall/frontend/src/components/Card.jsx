export default function Card({ title, subtitle, right, children }) {
  return (
    <section className="bg-white border rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          {title && <h2 className="font-semibold text-slate-900">{title}</h2>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
