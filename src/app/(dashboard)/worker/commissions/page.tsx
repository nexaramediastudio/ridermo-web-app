"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { DollarSign, Bike, Calendar } from "lucide-react";
import { useRole } from "@/components/providers/role-provider";

interface CommissionRow {
  id: string;
  amount: number;
  sale_date: string;
  status: string;
  sales: {
    invoice_number: string;
    inventory_bikes: {
      round_number: string;
      bike_models: { name: string } | null;
    } | null;
  } | null;
}

export default function WorkerCommissionsPage() {
  const { employeeId, profileName } = useRole();
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!employeeId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("worker_commissions")
      .select(`
        id, amount, sale_date, status,
        sales(invoice_number, inventory_bikes(round_number, bike_models(name)))
      `)
      .eq("employee_id", employeeId)
      .order("sale_date", { ascending: false })
      .limit(200);

    if (error) toast.error("Failed to load commissions");
    else setRows((data as unknown as CommissionRow[]) || []);
    setLoading(false);
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const thisMonth = rows.filter((r) => r.sale_date?.startsWith(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
  )).reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FF4C00]/10 flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-[#FF4C00]" />
        </div>
        <div>
          <h1 className="r-page-title">My Commissions</h1>
          <p className="r-page-sub">{profileName ? `${profileName} · ` : ""}Your bike sales commission only</p>
        </div>
      </div>

      {!employeeId ? (
        <div className="r-card-p text-center py-12">
          <p className="text-[13px] font-semibold text-[#4A4A4A]">No employee profile linked</p>
          <p className="text-[11px] text-[#9A9A9A] mt-1">Ask admin to link your login to an employee record in HR → Employees</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="r-kpi">
              <div>
                <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wide">This Month</p>
                <p className="text-xl font-bold tabular-nums mt-0.5 text-[#FF4C00]">Rs. {thisMonth.toLocaleString()}</p>
              </div>
              <Calendar className="h-4 w-4 text-[#D5D5D5]" />
            </div>
            <div className="r-kpi">
              <div>
                <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wide">All Time</p>
                <p className="text-xl font-bold tabular-nums mt-0.5 text-[#0A0A0A]">Rs. {total.toLocaleString()}</p>
              </div>
              <DollarSign className="h-4 w-4 text-[#D5D5D5]" />
            </div>
          </div>

          <div className="r-card overflow-hidden">
            <table className="r-table">
              <thead>
                <tr className="r-thead-row">
                  <th className="r-th">Date</th>
                  <th className="r-th">Invoice</th>
                  <th className="r-th">Bike</th>
                  <th className="r-th text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#F5F5F5]">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="r-td"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-16 text-center text-[13px] text-[#9A9A9A]">
                      No commissions yet — sell a bike on a day you are marked Present
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const bike = r.sales?.inventory_bikes;
                    return (
                      <tr key={r.id} className="r-tr">
                        <td className="r-td text-[12px] text-[#6B6B6B]">
                          {new Date(r.sale_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="r-td text-[12px] font-bold text-[#FF4C00] font-mono">{r.sales?.invoice_number || "—"}</td>
                        <td className="r-td">
                          <div className="flex items-center gap-1.5 text-[12px] text-[#0A0A0A]">
                            <Bike className="h-3 w-3 text-[#ABABAB]" />
                            {bike?.bike_models?.name || "—"} {bike?.round_number ? `· ${bike.round_number}` : ""}
                          </div>
                        </td>
                        <td className="r-td text-right text-[13px] font-bold">Rs. {Number(r.amount).toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
