export default function PayrollLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-hgh-border rounded" />
        <div className="h-10 w-32 bg-hgh-border rounded" />
      </div>

      <div className="h-12 w-96 bg-hgh-border rounded" />

      <div className="bg-white border border-hgh-border rounded-xl h-[400px]" />

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-white border border-hgh-border rounded-xl" />
        ))}
      </div>
    </div>
  );
}
