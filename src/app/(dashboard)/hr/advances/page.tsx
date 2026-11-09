"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Wallet, ChevronLeft, ChevronRight, Plus, Trash2,
  Users, DollarSign, Split, AlertCircle,
} from "lucide-react";
import { monthBounds } from "@/lib/hr/worker-commissions";

interface Employee {
  id: string;
  full_name: string;
  type: string;
}

interface AdvanceRow {
  id: string;
  batch_id: string;
  employee_id: string;
  amount: number;
  advance_date: string;
  notes?: string | null;
  created_at: string;
  employees: { full_name: string } | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function localISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(iso: string) {
  return new Date(String(iso).slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdvancesPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<AdvanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  const [advanceDate, setAdvanceDate] = useState(localISODate);
  const [totalAmount, setTotalAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [shares, setShares] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { start, end } = monthBounds(year, month);

    const [empRes, advRes] = await Promise.all([
      supabase.from("employees").select("id, full_name, type").eq("is_active", true).order("full_name"),
      supabase
        .from("salary_advances")
        .select("id, batch_id, employee_id, amount, advance_date, notes, created_at, employees(full_name)")
        .gte("advance_date", start)
        .lt("advance_date", end)
        .order("advance_date", { ascending: false }),
    ]);

    setEmployees(empRes.data || []);
    if (advRes.error) {
      const msg = advRes.error.message || "";
      if (msg.includes("salary_advances") || msg.includes("schema cache") || advRes.error.code === "42P01") {
        setTableMissing(true);
      } else {
        toast.error(msg);
      }
      setRows([]);
    } else {
      setTableMissing(false);
      setRows((advRes.data as unknown as AdvanceRow[]) || []);
    }
    setLoading(false);
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  }

  function setShare(id: string, value: string) {
    setShares((prev) => ({ ...prev, [id]: value }));
  }

  const allocated = useMemo(
    () => employees.reduce((sum, e) => sum + (parseFloat(shares[e.id]) || 0), 0),
    [employees, shares],
  );
  const target = parseFloat(totalAmount) || 0;
  const remaining = Math.round((target - allocated) * 100) / 100;

  function splitEqually() {
    if (!employees.length) return;
    const pool = parseFloat(totalAmount);
    if (!(pool > 0)) {
      toast.error("Enter the total advance amount first");
      return;
    }
    const n = employees.length;
    const base = Math.floor((pool / n) * 100) / 100;
    const next: Record<string, string> = {};
    let used = 0;
    employees.forEach((e, i) => {
      const amt = i === n - 1 ? Math.round((pool - used) * 100) / 100 : base;
      next[e.id] = amt.toFixed(2);
      used += amt;
    });
    setShares(next);
  }

  async function handleDistribute() {
    const items = employees
      .map((e) => ({ employee_id: e.id, amount: Math.round((parseFloat(shares[e.id]) || 0) * 100) / 100 }))
      .filter((i) => i.amount > 0);

    if (!items.length) {
      toast.error("Enter an amount for at least one employee");
      return;
    }
    if (target > 0 && Math.abs(allocated - target) > 0.05) {
      toast.error(`Distributed Rs. ${allocated.toLocaleString()} does not match total Rs. ${target.toLocaleString()}`);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const batchId = crypto.randomUUID();
    const date = advanceDate || localISODate();
    const { error } = await supabase.from("salary_advances").insert(
      items.map((i) => ({
        batch_id: batchId,
        employee_id: i.employee_id,
        amount: i.amount,
        advance_date: date,
        notes: notes.trim() || null,
      })),
    );
    if (error) {
      toast.error(error.message || "Failed to save advances. Run migration_027_salary_advances.sql in Supabase.");
    } else {
      toast.success(`Advance distributed to ${items.length} employee${items.length === 1 ? "" : "s"}`);
      setTotalAmount("");
      setNotes("");
      setShares({});
      load();
    }
    setSaving(false);
  }

  async function deleteBatch(batchId: string) {
    if (!window.confirm("Delete this advance distribution?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("salary_advances").delete().eq("batch_id", batchId);
    if (error) toast.error(error.message);
    else {
      toast.success("Advance removed");
      load();
    }
  }

  const batches = useMemo(() => {
    const map = new Map<string, { id: string; date: string; notes: string | null; items: AdvanceRow[]; total: number }>();
    for (const row of rows) {
      const existing = map.get(row.batch_id);
      if (existing) {
        existing.items.push(row);
        existing.total += Number(row.amount);
      } else {
        map.set(row.batch_id, {
          id: row.batch_id,
          date: row.advance_date,
          notes: row.notes || null,
          items: [row],
          total: Number(row.amount),
        });
      }
    }
    return [...map.values()];
  }, [rows]);

  const monthTotal = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const peoplePaid = new Set(rows.map((r) => r.employee_id)).size;

  const byEmployee = employees.map((e) => ({
    ...e,
    total: rows.filter((r) => r.employee_id === e.id).reduce((s, r) => s + Number(r.amount), 0),
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF4C00]/10 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-[#FF4C00]" />
          </div>
          <div>
            <h1 className="r-page-title">Advances</h1>
            <p className="r-page-sub">Give advance money and split it among employees — it is deducted from that month’s payroll</p>
          </div>
        </div>
      </div>

      {tableMissing && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            The advances table is not in the database yet. Run <strong>supabase/migration_027_salary_advances.sql</strong> in the Supabase SQL editor, then refresh this page.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="r-card p-4 flex items-center gap-3">
          <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E5E5E5] hover:bg-[#F5F5F5]">
            <ChevronLeft className="h-4 w-4 text-[#6B6B6B]" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-base font-bold text-[#0A0A0A]">{MONTHS[month - 1]}</p>
            <p className="text-xs text-[#9A9A9A]">{year}</p>
          </div>
          <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E5E5E5] hover:bg-[#F5F5F5]">
            <ChevronRight className="h-4 w-4 text-[#6B6B6B]" />
          </button>
        </div>
        {[
          { label: "Given this month", value: `Rs. ${monthTotal.toLocaleString()}`, icon: DollarSign, accent: true },
          { label: "Employees paid", value: String(peoplePaid), icon: Users },
          { label: "Distributions", value: String(batches.length), icon: Split },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className={`r-card p-4 ${accent ? "border-[#FF4C00]/20" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-[#FF4C00]/10" : "bg-[#F5F5F5]"}`}>
                <Icon className={`h-4 w-4 ${accent ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />
              </div>
            </div>
            <p className={`text-lg font-bold ${accent ? "text-[#FF4C00]" : "text-[#0A0A0A]"}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="r-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-[13px] font-bold text-[#0A0A0A]">Distribute advance</h2>
            <p className="text-[11px] text-[#9A9A9A] mt-0.5">Enter a total, split equally or type each person’s share</p>
          </div>
          <button type="button" onClick={splitEqually} className="r-btn-secondary">
            <Split className="h-3.5 w-3.5" /> Split equally
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="r-label">Date</label>
            <input type="date" value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)} className="r-input" />
          </div>
          <div>
            <label className="r-label">Total amount (Rs.)</label>
            <input type="number" min="0" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="0" className="r-input" />
          </div>
          <div>
            <label className="r-label">Note</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="r-input" />
          </div>
        </div>

        <div className="border border-[#F0F0F0] rounded-xl overflow-hidden">
          <table className="r-table">
            <thead>
              <tr className="r-thead-row">
                <th className="r-th">Employee</th>
                <th className="r-th">Already this month</th>
                <th className="r-th text-right">This share (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => {
                const already = byEmployee.find((x) => x.id === e.id)?.total || 0;
                return (
                  <tr key={e.id} className="r-tr">
                    <td className="r-td">
                      <p className="text-[13px] font-semibold text-[#0A0A0A]">{e.full_name}</p>
                      <p className="text-[11px] text-[#9A9A9A] capitalize">{e.type}</p>
                    </td>
                    <td className="r-td text-[12px] text-[#6B6B6B]">
                      {already > 0 ? `Rs. ${already.toLocaleString()}` : "—"}
                    </td>
                    <td className="r-td">
                      <input
                        type="number"
                        min="0"
                        value={shares[e.id] || ""}
                        onChange={(ev) => setShare(e.id, ev.target.value)}
                        placeholder="0"
                        className="r-input w-36 ml-auto text-right"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[12px] text-[#6B6B6B]">
            Allocated <span className="font-bold text-[#0A0A0A]">Rs. {allocated.toLocaleString()}</span>
            {target > 0 && (
              <>
                {" "}· Remaining{" "}
                <span className={`font-bold ${remaining === 0 ? "text-emerald-600" : "text-[#FF4C00]"}`}>
                  Rs. {remaining.toLocaleString()}
                </span>
              </>
            )}
          </p>
          <button
            onClick={handleDistribute}
            disabled={saving || tableMissing}
            className="r-btn-primary disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {saving ? "Saving..." : "Save distribution"}
          </button>
        </div>
      </div>

      <div className="r-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F0F0F0]">
          <h2 className="text-[13px] font-bold text-[#0A0A0A]">This month’s distributions</h2>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-[#F5F5F5] rounded-xl animate-pulse" />)}
          </div>
        ) : batches.length === 0 ? (
          <p className="px-5 py-12 text-center text-[13px] text-[#9A9A9A]">No advances in {MONTHS[month - 1]} {year}</p>
        ) : (
          <div className="divide-y divide-[#F5F5F5]">
            {batches.map((batch) => (
              <div key={batch.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-[#0A0A0A]">
                      {formatDate(batch.date)} · Rs. {batch.total.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-[#9A9A9A] mt-0.5">
                      {batch.items.length} employee{batch.items.length === 1 ? "" : "s"}
                      {batch.notes ? ` · ${batch.notes}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteBatch(batch.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#ABABAB] hover:bg-red-50 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {batch.items.map((item) => (
                    <span key={item.id} className="text-[11px] font-semibold bg-[#F5F5F5] text-[#4A4A4A] px-2 py-0.5 rounded-full">
                      {item.employees?.full_name || "Employee"} · Rs. {Number(item.amount).toLocaleString()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
