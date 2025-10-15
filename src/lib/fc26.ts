export type StatValue = number | null;

export type StatGroupKey =
  | "ritmo"
  | "tiro"
  | "pase"
  | "regate"
  | "defensa"
  | "fisico";

export type SubStats = {
  // Ritmo
  aceleracion?: StatValue;
  velocidad_sprint?: StatValue;
  // Tiro
  posicionamiento?: StatValue;
  remate?: StatValue;
  potencia_tiro?: StatValue;
  tiros_lejanos?: StatValue;
  voleas?: StatValue;
  penaltis?: StatValue;
  // Pase
  vision?: StatValue;
  centros?: StatValue;
  faltas?: StatValue; // Precisión de faltas
  pase_corto?: StatValue;
  pase_largo?: StatValue;
  efecto?: StatValue;
  // Regate
  agilidad?: StatValue;
  equilibrio?: StatValue;
  reacciones?: StatValue;
  control_balon?: StatValue;
  regate?: StatValue;
  compostura?: StatValue;
  // Defensa
  intercepciones?: StatValue;
  cabeceo?: StatValue; // Precisión de cabeza
  percepcion_defensiva?: StatValue; // Marcaje / Capacidad defensiva
  entrada_normal?: StatValue;
  entrada_agresiva?: StatValue;
  // Físico
  salto?: StatValue;
  resistencia?: StatValue;
  fuerza?: StatValue;
  agresividad?: StatValue;
};

export type StatGroups = {
  ritmo: { label: string; total?: StatValue; sub: (keyof SubStats)[] };
  tiro: { label: string; total?: StatValue; sub: (keyof SubStats)[] };
  pase: { label: string; total?: StatValue; sub: (keyof SubStats)[] };
  regate: { label: string; total?: StatValue; sub: (keyof SubStats)[] };
  defensa: { label: string; total?: StatValue; sub: (keyof SubStats)[] };
  fisico: { label: string; total?: StatValue; sub: (keyof SubStats)[] };
};

export const STAT_LABELS: Record<keyof SubStats, string> = {
  // Ritmo
  aceleracion: "Aceleración",
  velocidad_sprint: "Velocidad sprint",
  // Tiro
  posicionamiento: "Posicionamiento",
  remate: "Remate",
  potencia_tiro: "Potencia de tiro",
  tiros_lejanos: "Tiros lejanos",
  voleas: "Voleas",
  penaltis: "Penaltis",
  // Pase
  vision: "Visión",
  centros: "Centros",
  faltas: "Precisión de faltas",
  pase_corto: "Pase corto",
  pase_largo: "Pase largo",
  efecto: "Efecto",
  // Regate
  agilidad: "Agilidad",
  equilibrio: "Equilibrio",
  reacciones: "Reacciones",
  control_balon: "Control de balón",
  regate: "Regate",
  compostura: "Compostura",
  // Defensa
  intercepciones: "Intercepciones",
  cabeceo: "Cabeceo",
  percepcion_defensiva: "Percepción defensiva",
  entrada_normal: "Entrada normal",
  entrada_agresiva: "Entrada agresiva",
  // Físico
  salto: "Salto",
  resistencia: "Resistencia",
  fuerza: "Fuerza",
  agresividad: "Agresividad",
};

export const GROUPS: StatGroups = {
  ritmo: {
    label: "Ritmo",
    sub: ["aceleracion", "velocidad_sprint"],
  },
  tiro: {
    label: "Tiro",
    sub: [
      "posicionamiento",
      "remate",
      "potencia_tiro",
      "tiros_lejanos",
      "voleas",
      "penaltis",
    ],
  },
  pase: {
    label: "Pase",
    sub: ["vision", "centros", "faltas", "pase_corto", "pase_largo", "efecto"],
  },
  regate: {
    label: "Regate",
    sub: [
      "agilidad",
      "equilibrio",
      "reacciones",
      "control_balon",
      "regate",
      "compostura",
    ],
  },
  defensa: {
    label: "Defensa",
    sub: [
      "intercepciones",
      "cabeceo",
      "percepcion_defensiva",
      "entrada_normal",
      "entrada_agresiva",
    ],
  },
  fisico: {
    label: "Físico",
    sub: ["salto", "resistencia", "fuerza", "agresividad"],
  },
};

export type Player = {
  name: string;
  slug: string;
  image: string; // path under /public/cards
  overall?: number | null;
  position?: string | null;
  filigranas?: number | null; // Skill moves (1-5)
  pierna_mala?: number | null; // Weak foot (1-5)
  stats?: {
    ritmo?: { total?: StatValue } & Pick<SubStats, "aceleracion" | "velocidad_sprint">;
    tiro?: { total?: StatValue } & Pick<
      SubStats,
      | "posicionamiento"
      | "remate"
      | "potencia_tiro"
      | "tiros_lejanos"
      | "voleas"
      | "penaltis"
    >;
    pase?: { total?: StatValue } & Pick<
      SubStats,
      "vision" | "centros" | "faltas" | "pase_corto" | "pase_largo" | "efecto"
    >;
    regate?: { total?: StatValue } & Pick<
      SubStats,
      "agilidad" | "equilibrio" | "reacciones" | "control_balon" | "regate" | "compostura"
    >;
    defensa?: { total?: StatValue } & Pick<
      SubStats,
      | "intercepciones"
      | "cabeceo"
      | "percepcion_defensiva"
      | "entrada_normal"
      | "entrada_agresiva"
    >;
    fisico?: { total?: StatValue } & Pick<
      SubStats,
      "salto" | "resistencia" | "fuerza" | "agresividad"
    >;
  };
};
