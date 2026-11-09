export type VehicleKind = "2w" | "3w";

export function isThreeWheeler(model?: { tvs_category?: string; bike_category?: string } | null): boolean {
  return model?.tvs_category === "3W" || model?.bike_category === "3w";
}

export function matchesVehicleKind(
  model: { tvs_category?: string; bike_category?: string } | null | undefined,
  kind: VehicleKind,
): boolean {
  const three = isThreeWheeler(model);
  return kind === "3w" ? three : !three;
}
