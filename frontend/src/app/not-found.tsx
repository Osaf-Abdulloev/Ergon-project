"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-6xl font-black text-slate-900 dark:text-white">404</h1>
        <p className="text-base font-bold text-slate-700 dark:text-slate-300">
          Саҳифа пайдо нашуд
        </p>
        <p className="text-xs text-slate-500">
          Саҳифае, ки шумо ҷустуҷӯ доред, вуҷуд надорад ё интиқол дода шудааст.
        </p>
        <Link href="/">
          <Button variant="gradient" size="md" leftIcon={<Home className="w-4 h-4" />}>
            Ба саҳифаи асосӣ
          </Button>
        </Link>
      </div>
    </div>
  );
}
