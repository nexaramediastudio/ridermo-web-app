"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, X, Umbrella, CheckCircle2, XCircle, Clock } from "lucide-react";

interface LeaveRequest {
  id: string;
  type: string;
  from_date: string;
  to_date: string;
  days: number;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  employees: { full_name: string } | null;
}

export default function LeavePage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);
  const [form, setForm] = useState({ employee_id: "", type: "casual", from_date: "", to_date: "", reason: "" });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [leavesRes, empRes] = await Promise.all([
      supabase.from("leaves").select("*, employees(full_name)").order("created_at", { ascending: false }),
      supabase.from("employees").select("id, full_name").eq("is_active", true).order("full_name"),
    ]);
    setLeaves((leavesRes.data as unknown as LeaveRequest[]) || []);
    setEmployees(empRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const from = new Date(form.from_date);
    const to = new Date(form.to_date);
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const supabase = createClient();
    const { error } = await supabase.from("leaves").insert({ ...form, days, status: "pending" });
    if (error) toast.error(error.message);
    else { toast.success("Leave request added"); setShowAdd(false); loadData(); }
    setSaving(false);
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    const supabase = createClient();
    await supabase.from("leaves").update({ status }).eq("id", id);
    toast.success(`Leave ${status}`);
    loadData();
  }

  const STATUS_STYLES = {
    pending: "bg-amber-50 text-amber-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-600",
  };

  return (
    <div className="space-y-5 max-w-[1000px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Leave Management</h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">{leaves.filter(l => l.status === "pending").length} pending requests</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 h-9 px-4 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl">
          <Plus className="h-4 w-4" /> Add Leave
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#EFEFEF] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F0F0F0]">
              {["Employee", "Type", "From", "To", "Days", "Reason", "Status", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F8F8F8]">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-[#F0F0F0] rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : leaves.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-[#ABABAB]">
                <Umbrella className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No leave requests</p>
              </td></tr>
            ) : (
              leaves.map((leave) => (
                <tr key={leave.id} className="border-b border-[#F8F8F8] hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-4"><span className="text-sm font-semibold text-[#0A0A0A]">{leave.employees?.full_name || "—"}</span></td>
                  <td className="px-5 py-4"><span className="text-sm capitalize text-[#4A4A4A]">{leave.type.replace("_", " ")}</span></td>
                  <td className="px-5 py-4"><span className="text-sm text-[#4A4A4A]">{new Date(leave.from_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></td>
                  <td className="px-5 py-4"><span className="text-sm text-[#4A4A4A]">{new Date(leave.to_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></td>
                  <td className="px-5 py-4"><span className="text-sm font-bold text-[#0A0A0A]">{leave.days}</span></td>
                  <td className="px-5 py-4"><span className="text-sm text-[#6B6B6B] max-w-[150px] truncate block">{leave.reason || "—"}</span></td>
                  <td className="px-5 py-4"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[leave.status]}`}>{leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}</span></td>
                  <td className="px-5 py-4">
                    {leave.status === "pending" && (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateStatus(leave.id, "approved")} className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => updateStatus(leave.id, "rejected")} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><XCircle className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#EFEFEF] z-10">
            <div className="flex items-center justify-between p-6 border-b border-[#F0F0F0]">
              <h3 className="text-lg font-bold text-[#0A0A0A]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Add Leave Request</h3>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F5F5]"><X className="h-4 w-4 text-[#6B6B6B]" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1A1A1A]">Employee <span className="text-[#FF4C00]">*</span></label>
                <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} required className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white">
                  <option value="">Select employee...</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1A1A1A]">Leave Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white">
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="annual">Annual Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1A1A1A]">From <span className="text-[#FF4C00]">*</span></label>
                  <input type="date" value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })} required className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1A1A1A]">To <span className="text-[#FF4C00]">*</span></label>
                  <input type="date" value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} required className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1A1A1A]">Reason</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for leave..." rows={2} className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 h-10 rounded-xl border border-[#E5E5E5] text-sm font-semibold text-[#4A4A4A] hover:bg-[#F5F5F5]">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 h-10 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl disabled:opacity-60">{saving ? "Saving..." : "Add Leave"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
