"use client";

import { TrendingUp } from "lucide-react";
import { IncomePanel } from "@/components/finance/income-panel";

export default function IncomePage() {
  return (
    <div className="relative left-1/2 -translate-x-1/2 w-screen px-6 pb-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="r-page-title">Income</h1>
          <p className="r-page-sub">TVS, finance, insurance commissions and other dealership earnings</p>
        </div>
      </div>
      <IncomePanel />
    </div>
  );
}
