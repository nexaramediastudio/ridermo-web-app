import type { SupabaseClient } from "@supabase/supabase-js";

export type AttendanceLeaveStatus = "sick_leave" | "casual_leave" | "holiday";

const ATTENDANCE_TO_LEAVE_TYPE: Record<AttendanceLeaveStatus, "sick" | "casual" | "annual"> = {
  sick_leave: "sick",
  casual_leave: "casual",
  holiday: "annual",
};

export function isAttendanceLeaveStatus(status: string | null): status is AttendanceLeaveStatus {
  return status === "sick_leave" || status === "casual_leave" || status === "holiday";
}

/** Sync Leave Management from attendance save for a single date */
export async function syncLeavesFromAttendance(
  supabase: SupabaseClient,
  date: string,
  records: { employee_id: string; status: string }[],
): Promise<{ synced: number }> {
  await supabase.from("leaves").delete().eq("attendance_date", date);

  const leaveRows = records
    .filter((r): r is { employee_id: string; status: AttendanceLeaveStatus } =>
      isAttendanceLeaveStatus(r.status),
    )
    .map((r) => ({
      employee_id: r.employee_id,
      type: ATTENDANCE_TO_LEAVE_TYPE[r.status],
      from_date: date,
      to_date: date,
      days: 1,
      reason: "Marked from attendance",
      status: "approved" as const,
      attendance_date: date,
    }));

  if (leaveRows.length === 0) return { synced: 0 };

  const { error } = await supabase.from("leaves").insert(leaveRows);
  if (error) throw error;

  return { synced: leaveRows.length };
}
