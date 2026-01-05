export default function Badge({ status }) {
  const map = {
    PENDING: "bg-yellow-100 text-yellow-700",
    COUNTERED: "bg-blue-100 text-blue-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    CANCELLED: "bg-slate-200 text-slate-700",
  };
  const cls = map[status] || "bg-slate-200 text-slate-700";
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}
