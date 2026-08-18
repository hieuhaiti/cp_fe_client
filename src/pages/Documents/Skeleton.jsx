import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const DocumentListSkeletonCard = () => (
  <Card className="overflow-hidden p-0">
    <CardContent className="flex min-h-36 flex-col p-5">
      <div className="mb-3 flex gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="mb-2 h-6 w-5/6" />
      <Skeleton className="mb-4 h-5 w-1/2" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-28" />
      </div>
    </CardContent>
  </Card>
);

export const DocumentDetailSkeleton = () => (
  <div className="min-h-screen bg-(image:--gradient-surface-page)">
    <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <Skeleton className="mb-6 h-9 w-32" />
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-10">
        <Skeleton className="mb-3 h-5 w-36" />
        <Skeleton className="mb-3 h-10 w-full max-w-3xl" />
        <Skeleton className="mb-6 h-10 w-2/3" />
        <div className="flex flex-wrap gap-3 border-t border-border pt-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  </div>
);
