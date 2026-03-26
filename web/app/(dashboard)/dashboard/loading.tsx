export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-32 bg-hgh-border rounded" />
          <div className="h-4 w-64 bg-hgh-border rounded" />
        </div>
        <div className="h-8 w-20 bg-hgh-border rounded" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white border border-hgh-border rounded-xl" />
        ))}
      </div>

      <div className="h-96 bg-white border border-hgh-border rounded-xl" />

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-white border border-hgh-border rounded-xl" />
        ))}
      </div>
    </div>
  );
}
