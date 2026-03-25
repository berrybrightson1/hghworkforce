export default function EmployeesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-hgh-border rounded" />
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-hgh-border rounded" />
          <div className="h-10 w-32 bg-hgh-border rounded" />
        </div>
      </div>

      <div className="h-16 bg-white border border-hgh-border rounded-xl" />

      <div className="bg-white border border-hgh-border rounded-xl overflow-hidden">
        <div className="h-12 bg-hgh-offwhite border-b border-hgh-border" />
        <div className="space-y-0 divide-y divide-hgh-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
