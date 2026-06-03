"use client";

import { Receipt } from "lucide-react";
import { CommissionsPanel } from "@/components/finance/commissions-panel";
import { REVENUE_RECOGNITION_NOTE } from "@/lib/finance/commission-records";

export default function CommissionsPage() {
  return (
    <div className="relative left-1/2 -translate-x-1/2 w-screen px-6 pb-8 flex flex-col min-h-[calc(100vh-3.5rem-3rem)] space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF4C00]/10 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-[#FF4C00]" />
          </div>
          <div>
            <h1 className="r-page-title">Commission Records</h1>
            <p className="r-page-sub">{REVENUE_RECOGNITION_NOTE}</p>
          </div>
        </div>
      </div>

      <CommissionsPanel className="flex-1 min-h-0" />
    </div>
  );
}
