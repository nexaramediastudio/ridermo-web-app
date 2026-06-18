"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Calendar, ChevronLeft, ChevronRight, Save, UserCheck, UserX, Clock, Stethoscope, Umbrella, Sun } from "lucide-react";
import { syncWorkerCommissionsForDate } from "@/lib/hr/worker-commissions";
import { syncLeavesFromAttendance } from "@/lib/hr/sync-leaves-from-attendance";
import { useRole } from "@/components/providers/role-provider";

type AttendanceStatus = "present" | "absent" | "half_day" | "sick_leave" | "casual_leave" | "holiday";

interface Employee {
  id: string;
  full_name: string;
  type: "director" | "worker";
  employee_code?: string;
  is_active: boolean;
}

interface AttendanceRecord {
  employee_id: string;
  status: AttendanceStatus | null;
  check_in?: string;
  check_out?: string;
  ot_hours?: number;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { value: "present", label: "Present", icon: UserCheck, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  { value: "absent", label: "Absent", icon: UserX, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  { value: "half_day", label: "Half Day", icon: Clock, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  { value: "sick_leave", label: "Sick Leave", icon: Stethoscope, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  { value: "casual_leave", label: "Casual Leave", icon: Umbrella, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  { value: "holiday", label: "Holiday", icon: Sun, color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
];

export default function AttendancePage() {
  const { role, employeeId } = useRole();
  const isSelfOnly = role === "worker";
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [empResult, attResult] = await Promise.all([
      supabase.from("employees").select("id, full_name, type, employee_code, is_active").eq("is_active", true).order("full_name"),
      supabase.from("attendance").select("*").eq("date", selectedDate),
    ]);

    const emps = (empResult.data || []).filter((e) =>
      !isSelfOnly || (employeeId && e.id === employeeId),
    );
    const existingAtt = attResult.data || [];

    setEmployees(emps);

    const saved = new Set(existingAtt.map((a) => a.employee_id));
    setSavedIds(saved);
    setDraftIds(new Set());

    const attMap: Record<string, AttendanceRecord> = {};
    emps.forEach((emp) => {
      const existing = existingAtt.find((a) => a.employee_id === emp.id);
      attMap[emp.id] = existing
        ? {
            employee_id: emp.id,
            status: existing.status as AttendanceStatus,
            check_in: existing.check_in,
            check_out: existing.check_out,
            ot_hours: existing.ot_hours,
          }
        : { employee_id: emp.id, status: null };
    });
    setAttendance(attMap);
    setLoading(false);
  }, [selectedDate, isSelfOnly, employeeId]);

  useEffect(() => { loadData(); }, [loadData]);

  function setStatus(empId: string, status: AttendanceStatus) {
    setAttendance((prev) => ({ ...prev, [empId]: { ...prev[empId], status } }));
    setDraftIds((prev) => new Set(prev).add(empId));
  }

  function clearMark(empId: string) {
    setAttendance((prev) => ({ ...prev, [empId]: { ...prev[empId], status: null, ot_hours: 0 } }));
    setDraftIds((prev) => new Set(prev).add(empId));
  }

  function isMarked(empId: string) {
    const rec = attendance[empId];
    return rec?.status != null;
  }

  function markState(empId: string): "saved" | "draft" | "not_marked" {
    if (isMarked(empId) && savedIds.has(empId) && !draftIds.has(empId)) return "saved";
    if (isMarked(empId)) return "draft";
    if (savedIds.has(empId)) return "draft";
    return "not_marked";
  }

  function markAll(status: AttendanceStatus) {
    const updated = { ...attendance };
    const nextDraft = new Set(draftIds);
    Object.keys(updated).forEach((id) => {
      updated[id] = { ...updated[id], status };
      nextDraft.add(id);
    });
    setAttendance(updated);
    setDraftIds(nextDraft);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const records = Object.values(attendance)
      .filter((rec) => rec.status != null)
      .map((rec) => ({
        employee_id: rec.employee_id,
        date: selectedDate,
        status: rec.status!,
        check_in: rec.check_in || null,
        check_out: rec.check_out || null,
        ot_hours: rec.ot_hours || 0,
      }));

    if (records.length === 0) {
      toast.error("Mark at least one employee before saving");
      setSaving(false);
      return;
    }

    const unmarkedCount = employees.length - records.length;
    if (unmarkedCount > 0 && !window.confirm(`${unmarkedCount} employee(s) still not marked. Save ${records.length} marked only?`)) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("attendance")
      .upsert(records, { onConflict: "employee_id,date" });

    if (error) toast.error(error.message);
    else {
      const toRemove = [...savedIds].filter((id) => !records.some((r) => r.employee_id === id));
      if (toRemove.length) {
        await supabase.from("attendance").delete().eq("date", selectedDate).in("employee_id", toRemove);
      }

      try {
        const { added, removed } = await syncWorkerCommissionsForDate(supabase, selectedDate);
        const { synced: leaveSynced } = await syncLeavesFromAttendance(supabase, selectedDate, records);

        const parts: string[] = ["Attendance saved"];
        if (leaveSynced > 0) {
          parts.push(`${leaveSynced} leave record${leaveSynced !== 1 ? "s" : ""} added to Leave Management`);
        }
        if (added > 0) {
          parts.push(`${added} bike commission${added !== 1 ? "s" : ""} added`);
        } else if (removed > 0) {
          parts.push(`${removed} bike commission${removed !== 1 ? "s" : ""} removed`);
        }
        toast.success(parts.join(" · "));
      } catch (syncErr) {
        toast.error((syncErr as Error).message || "Attendance saved but sync failed");
      }
      setSavedIds(new Set(records.map((r) => r.employee_id)));
      setDraftIds(new Set());
    }
    setSaving(false);
  }

  function changeDate(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split("T")[0]);
  }

  const markedCount = employees.filter((e) => isMarked(e.id)).length;
  const notMarkedCount = employees.length - markedCount;
  const savedCount = employees.filter((e) => markState(e.id) === "saved").length;
  const hasExisting = savedIds.size > 0;

  const counts = {
    present: Object.values(attendance).filter((a) => a.status === "present").length,
    absent: Object.values(attendance).filter((a) => a.status === "absent").length,
    half_day: Object.values(attendance).filter((a) => a.status === "half_day").length,
    leave: Object.values(attendance).filter((a) => a.status != null && ["sick_leave", "casual_leave"].includes(a.status)).length,
    holiday: Object.values(attendance).filter((a) => a.status === "holiday").length,
  };

  const dateDisplay = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="r-page-title">Attendance</h1>
            <p className="r-page-sub">{employees.length} active employees</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="r-btn-primary disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : hasExisting ? "Update Attendance" : "Save Attendance"}
        </button>
      </div>

      {/* Date picker + summary */}
      <div className="r-card-p flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button onClick={() => changeDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E8E8E8] hover:bg-[#F5F5F5] transition-all">
            <ChevronLeft className="h-4 w-4 text-[#6B6B6B]" />
          </button>
          <div className="flex items-center gap-2 px-3">
            <Calendar className="h-3.5 w-3.5 text-[#FF4C00]" />
            <span className="text-[13px] font-semibold text-[#0A0A0A]">{dateDisplay}</span>
            {isToday && <span className="r-badge bg-[#FF4C00] text-white">Today</span>}
          </div>
          <button onClick={() => changeDate(1)} disabled={isToday} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E8E8E8] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <ChevronRight className="h-4 w-4 text-[#6B6B6B]" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="r-input w-auto"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {[
            { label: "Present",  value: counts.present,  cls: "r-badge-green" },
            { label: "Absent",   value: counts.absent,   cls: "r-badge-red" },
            { label: "Half Day", value: counts.half_day, cls: "r-badge-amber" },
            { label: "Leave",    value: counts.leave,    cls: "r-badge-blue" },
          ].map(({ label, value, cls }) => value > 0 ? (
            <span key={label} className={`${cls} text-[11px] font-bold`}>{value} {label}</span>
          ) : null)}
        </div>
      </div>

      {/* Marked / Not Marked summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="r-kpi">
          <div>
            <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wide">Marked</p>
            <p className="text-xl font-bold tabular-nums mt-0.5 text-emerald-600">{markedCount}</p>
          </div>
          <UserCheck className="h-4 w-4 text-emerald-300" />
        </div>
        <div className="r-kpi">
          <div>
            <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wide">Not Marked</p>
            <p className="text-xl font-bold tabular-nums mt-0.5 text-amber-600">{notMarkedCount}</p>
          </div>
          <UserX className="h-4 w-4 text-amber-300" />
        </div>
        <div className="r-kpi">
          <div>
            <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wide">Saved</p>
            <p className="text-xl font-bold tabular-nums mt-0.5 text-[#0A0A0A]">{savedCount}</p>
          </div>
          <Save className="h-4 w-4 text-[#D5D5D5]" />
        </div>
        <div className="r-kpi">
          <div>
            <p className="text-[11px] font-semibold text-[#9A9A9A] uppercase tracking-wide">Unsaved changes</p>
            <p className="text-xl font-bold tabular-nums mt-0.5 text-[#FF4C00]">{draftIds.size}</p>
          </div>
          <Clock className="h-4 w-4 text-[#FF4C00]/40" />
        </div>
      </div>

      {notMarkedCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-[12px] text-amber-800">
          <UserX className="h-4 w-4 flex-shrink-0" />
          <span><strong>{notMarkedCount}</strong> employee{notMarkedCount !== 1 ? "s" : ""} not marked yet — pick a status below, then Save.</span>
        </div>
      )}

      {/* Quick mark all */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider mr-1">Mark all:</span>
        {STATUS_OPTIONS.slice(0, 3).map((s) => (
          <button
            key={s.value}
            onClick={() => markAll(s.value)}
            className={`flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold border transition-all hover:opacity-80 ${s.bg} ${s.color}`}
          >
            <s.icon className="h-3 w-3" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Attendance List */}
      <div className="r-card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#F5F5F5]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-[#F0F0F0]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#F0F0F0] rounded w-40" />
                  <div className="h-3 bg-[#F0F0F0] rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[13px] font-medium text-[#6B6B6B]">No active employees</p>
            <p className="text-[11px] text-[#ABABAB] mt-1">Add employees in the Employees section first</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F5F5F5]">
            <div className="hidden sm:grid grid-cols-[140px_1fr_auto] gap-4 px-5 py-2 bg-[#FAFAFA] border-b border-[#F0F0F0]">
              <span className="text-[10px] font-bold text-[#9A9A9A] uppercase">Marked?</span>
              <span className="text-[10px] font-bold text-[#9A9A9A] uppercase">Employee &amp; Status</span>
              <span className="text-[10px] font-bold text-[#9A9A9A] uppercase text-right">OT</span>
            </div>
            {employees.map((emp) => {
              const rec = attendance[emp.id];
              const currentStatus = rec?.status ?? null;
              const state = markState(emp.id);

              const markBadge =
                state === "saved"
                  ? { label: "Marked", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
                  : state === "draft" && isMarked(emp.id)
                    ? { label: "Marked (unsaved)", cls: "bg-amber-50 text-amber-700 border-amber-200" }
                    : state === "draft"
                      ? { label: "Not Marked (unsaved)", cls: "bg-red-50 text-red-600 border-red-200" }
                      : { label: "Not Marked", cls: "bg-[#F5F5F5] text-[#9A9A9A] border-[#E8E8E8]" };

              return (
                <div key={emp.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 px-5 py-3 transition-colors ${state === "not_marked" ? "bg-amber-50/30" : "hover:bg-[#FAFAFA]"}`}>
                  <div className="flex items-center gap-3 sm:w-[140px] flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap ${markBadge.cls}`}>
                      {markBadge.label}
                    </span>
                    {state !== "not_marked" && (
                      <button
                        type="button"
                        onClick={() => clearMark(emp.id)}
                        className="text-[10px] font-semibold text-[#9A9A9A] hover:text-red-500 underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${emp.type === "director" ? "bg-[#FF4C00]/15 text-[#FF4C00]" : "bg-[#F5F5F5] text-[#6B6B6B]"}`}>
                    {emp.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>

                  <div className="w-40 sm:w-52 flex-shrink-0 min-w-0">
                    <p className="text-[13px] font-semibold text-[#0A0A0A] truncate">{emp.full_name}</p>
                    <p className="text-[11px] text-[#9A9A9A] capitalize">{emp.type}{emp.employee_code ? ` · ${emp.employee_code}` : ""}</p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setStatus(emp.id, s.value)}
                        className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold border transition-all whitespace-nowrap ${
                          currentStatus === s.value
                            ? `${s.bg} ${s.color}`
                            : "border-[#E8E8E8] text-[#9A9A9A] hover:text-[#0A0A0A] hover:bg-[#F5F5F5] hover:border-[#D0D0D0]"
                        }`}
                      >
                        <s.icon className="h-3.5 w-3.5 flex-shrink-0" />
                        {s.label}
                      </button>
                    ))}
                  </div>
                  </div>

                  {currentStatus === "present" && (
                    <div className="flex items-center gap-1.5 flex-shrink-0 sm:ml-auto pl-[152px] sm:pl-0">
                      <span className="text-[11px] text-[#9A9A9A] font-medium">OT</span>
                      <input
                        type="number"
                        min="0"
                        max="12"
                        step="0.5"
                        value={rec?.ot_hours || ""}
                        onChange={(e) => {
                          setDraftIds((prev) => new Set(prev).add(emp.id));
                          setAttendance((prev) => ({
                            ...prev,
                            [emp.id]: { ...prev[emp.id], ot_hours: parseFloat(e.target.value) || 0 },
                          }));
                        }}
                        placeholder="0"
                        className="w-14 h-7 px-2 rounded-lg border border-[#E8E8E8] text-[11px] text-center focus:outline-none focus:border-[#FF4C00]"
                      />
                      <span className="text-[11px] text-[#9A9A9A]">hrs</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {employees.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="r-btn-primary disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      )}
    </div>
  );
}
