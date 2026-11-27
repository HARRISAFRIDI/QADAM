import { Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-3 h-4 w-32" />
      <Skeleton className="mb-8 h-9 w-72" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
      <Skeleton className="mt-8 h-64" />
    </div>
  );
}
