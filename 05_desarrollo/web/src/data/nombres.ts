const NOMBRES_PARCELA: Record<string, string> = {
  P01: "Chacra de Huanta",
  P02: "Chacra de Quinua",
  P03: "Chacra de Acosvinchos",
  P04: "Chacra de Pacaycasa",
  P05: "Chacra alta de Chiara 2",
  P06: "Chacra de Acocro",
  P07: "Chacra alta de Chiara 1",
  P08: "Chacra alta de Vinchos",
  P09: "Chacra de Cangallo",
  P10: "Chacra de Vilcashuamán",
};

export function getParcelaNombre(id: string, fallbackDistrito?: string): string {
  if (NOMBRES_PARCELA[id]) {
    return NOMBRES_PARCELA[id];
  }
  if (!fallbackDistrito) return id;
  return `Chacra de ${fallbackDistrito.replace(/_/g, " ")}`;
}
