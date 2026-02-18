"use client";

export function PageLoadingState() {
  return (
    <div className="flex min-h-[45vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#f4b133]/30 border-t-[#f4b133]" />
        <p className="text-sm font-medium text-slate-600">Fetching and rendering components.</p>
      </div>
    </div>
  );
}
