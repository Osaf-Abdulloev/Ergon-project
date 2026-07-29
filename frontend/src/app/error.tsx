"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { RefreshCw, AlertOctagon } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mx-auto flex items-center justify-center">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white">500</h1>
        <p className="text-base font-bold text-slate-700 dark:text-slate-300">
          Хатогии дохилии сервер
        </p>
        <p className="text-xs text-slate-500">
          Ҳангоми коркарди дархости шумо хатогӣ ба миён омад.
        </p>
        <Button variant="gradient" size="md" onClick={() => reset()} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Дубора кӯшиш кунед
        </Button>
      </div>
    </div>
  );
}
