/**
 * Marco legal por ejercicio fiscal. Todo lo que cambia año con año (tabla del Art. 37, topes,
 * decretos transitorios) vive aquí, junto con las notas que la app muestra en cada pestaña.
 * Para un año nuevo o una reforma: agrega un bloque en YEAR_OVERRIDES y sus notas.
 */

export interface TaxBracket {
  tramo: string;
  desde: number;
  hasta: number | null;
  tasa: number;
  exceso: number;
  cuotaFija: number;
}

export interface LegalNote {
  kind: 'ley' | 'cambio' | 'aviso';
  title: string;
  detail: string;
  source?: { label: string; url: string };
}

/**
 * Forma de aplicar el Art. 37 en el F11 de un año. Normalmente hay una sola; cuando la tabla cambia a
 * mitad de año hay varias (tabla nueva todo el año, proporcional por meses, tabla anterior) y el usuario
 * elige. El impuesto es la suma de cada tabla por su peso (fracción del año).
 */
export interface TableOption {
  id: string;
  label: string;
  detail: string;
  parts: { brackets: TaxBracket[]; weight: number }[];
}

export interface YearRules {
  year: number;
  /** Tabla que se muestra (la principal de la opción elegida). */
  brackets: TaxBracket[];
  bracketsLabel: string;
  tableOptions: TableOption[];
  tableId: string;
  medicalCap: number;
  eduCap: number;
  aguinaldoCap: number;
  fixedSalaryDeduction: number;
  fixedSalaryDeductionLimit: number;
  notes: LegalNote[];
}

/** Tabla original del Art. 37 (D.L. 957, 2011): ejercicios hasta 2024. */
export const ANNUAL_TAX_BRACKETS_2011: TaxBracket[] = [
  { tramo: 'I', desde: 0.01, hasta: 4064.0, tasa: 0, exceso: 0, cuotaFija: 0 },
  { tramo: 'II', desde: 4064.01, hasta: 9142.86, tasa: 0.1, exceso: 4064.0, cuotaFija: 212.12 },
  { tramo: 'III', desde: 9142.87, hasta: 22857.14, tasa: 0.2, exceso: 9142.86, cuotaFija: 720.0 },
  { tramo: 'IV', desde: 22857.15, hasta: null, tasa: 0.3, exceso: 22857.14, cuotaFija: 3462.86 },
];

/** Reforma de abril 2025 (vigente desde el 8 de mayo de 2025): exento hasta $6,600 anuales ($550/mes). */
export const ANNUAL_TAX_BRACKETS: TaxBracket[] = [
  { tramo: 'I', desde: 0.01, hasta: 6600.0, tasa: 0, exceso: 0, cuotaFija: 0 },
  { tramo: 'II', desde: 6600.01, hasta: 9142.86, tasa: 0.1, exceso: 6600.0, cuotaFija: 212.12 },
  { tramo: 'III', desde: 9142.87, hasta: 22857.14, tasa: 0.2, exceso: 9142.86, cuotaFija: 720.0 },
  { tramo: 'IV', desde: 22857.15, hasta: null, tasa: 0.3, exceso: 22857.14, cuotaFija: 3462.86 },
];

export const REFORM_2025_YEAR = 2025;

const SRC = {
  reforma2025: {
    label: 'Reforma Art. 37 (El Mundo)',
    url: 'https://diario.elmundo.sv/politica/esto-dice-la-reforma-que-amplio-el-monto-exento-del-impuesto-sobre-la-renta',
  },
  tablas2025: {
    label: 'Nuevas tablas de retención 2025 (El Mundo)',
    url: 'https://diario.elmundo.sv/politica/vigente-nuevo-monto-exento-de-impuesto-sobre-la-renta-asi-quedan-los-calculos-de-retencion',
  },
  guiaMH: {
    label: 'Guía de declaración F11 (Ministerio de Hacienda)',
    url: 'https://www.mh.gob.sv/wp-content/uploads/2020/11/PMHDC8220.pdf',
  },
  f14: {
    label: 'Formulario F14 paso a paso (Facxi)',
    url: 'https://facxi.com/blog/formulario-f14-pago-a-cuenta-retenciones-el-salvador',
  },
  iva28: { label: 'Art. 28 Ley de IVA', url: 'https://hazconta.com/leyes/ley-de-iva/art-28' },
  art4: { label: 'Art. 4 LISR (rentas no gravables)', url: 'https://hazconta.com/leyes/ley-de-renta/art-4' },
  aguinaldoHistoria: {
    label: 'Historia de la exención del aguinaldo (El Mundo)',
    url: 'https://diario.elmundo.sv/politica/asamblea-sube-exencion-a-aguinaldos-luego-de-discusion-politica',
  },
  aguinaldo2022: {
    label: 'Exención aguinaldo 2022 (Bloomberg Línea)',
    url: 'https://www.bloomberglinea.com/2022/12/05/aguinaldo-de-el-salvador-cuando-empezara-a-pagarse-y-como-sera-la-exencion-del-isr/',
  },
  aguinaldo2023: {
    label: 'Decreto aguinaldo 2023 (Contaportable)',
    url: 'https://www.contaportable.com/wp-content/uploads/2023/12/Decreto-Aguinaldo-Exento-Ano-2023-hasta-1500-dls-.pdf',
  },
  aguinaldo2024: {
    label: 'Decreto aguinaldo 2024 (ECIJA)',
    url: 'https://ecija.com/sala-de-prensa/alivio-economico-para-los-trabajadores-decreto-legislativo-exonera-el-aguinaldo-de-impuestos-en-el-salvador',
  },
  aguinaldo2025: {
    label: 'Decreto aguinaldo 2025 (Bloomberg Línea)',
    url: 'https://www.bloomberglinea.com/latinoamerica/el-salvador/el-aguinaldo-en-el-salvador-se-podra-pagar-desde-el-1-de-octubre-y-hasta-us1500-quedan-exentos-de-renta/',
  },
  aguinaldo2026: {
    label: 'Decreto aguinaldo 2026 (El Mundo)',
    url: 'https://diario.elmundo.sv/politica/eximen-de-impuesto-los-aguinaldos-en-empresa-privada-y-estado-hasta-por-1500-para-2026',
  },
};

/** Notas que aplican a todos los años. */
const BASE_NOTES: LegalNote[] = [
  {
    kind: 'ley',
    title: 'Art. 37 LISR: tabla anual',
    detail: 'El impuesto del año se calcula sobre la renta neta imponible con la tabla de tramos de este ejercicio.',
  },
  {
    kind: 'ley',
    title: 'Arts. 32–33 LISR: gastos médicos y educativos',
    detail: 'Hasta $800 por categoría, con facturas a tu nombre. Cada $100 deducidos bajan el impuesto $20 en el tramo III.',
    source: SRC.guiaMH,
  },
  {
    kind: 'ley',
    title: 'Art. 29 num. 7 LISR: deducción fija de $1,600',
    detail:
      'Solo si todos tus ingresos son salarios y suman $9,100 o menos. Las tablas de retención la asumen siempre, por eso un asalariado del tramo III suele terminar debiendo 20% × $1,600 = $320 en el F11.',
    source: SRC.guiaMH,
  },
  {
    kind: 'ley',
    title: 'Art. 4 num. 3 LISR: indemnización por despido',
    detail:
      'No paga renta hasta 30 días de salario básico por cada año de servicio (salario promedio de los últimos 12 meses). La indemnización legal completa cabe en ese tope. Las vacaciones proporcionales de la liquidación sí son salario gravado, y el aguinaldo proporcional va como Aguinaldo.',
    source: SRC.art4,
  },
  {
    kind: 'ley',
    title: 'Negocio propio y alquileres (Arts. 28–29 LISR)',
    detail:
      'Tributa la ganancia: ventas o alquileres menos los costos y gastos necesarios, con factura. Se suma al salario en el mismo F11 y, al no ser todo salario, se pierde la deducción fija de $1,600.',
  },
  {
    kind: 'ley',
    title: 'Pago a cuenta (Art. 151 Código Tributario)',
    detail:
      'Las personas naturales con negocio declaran cada mes en el F14 el 1.75% de sus ventas brutas. Lo pagado se resta del impuesto en el F11. Hay tasas especiales (0.3%) para algunas actividades.',
    source: SRC.f14,
  },
  {
    kind: 'ley',
    title: 'Inscripción en IVA (Art. 28 Ley de IVA)',
    detail:
      'Debes inscribirte si en los últimos 12 meses vendiste $5,714.29 o más (¢50,000), o si tus activos llegan a $2,285.71 (¢20,000). Cuentan las ventas gravadas y exentas.',
    source: SRC.iva28,
  },
  {
    kind: 'ley',
    title: 'Obligación de declarar',
    detail: 'Asalariados con ingresos de $60,000 o menos declaran solo si les toca pagar o si quieren su devolución.',
    source: SRC.guiaMH,
  },
];

/**
 * Aguinaldo (Art. 4 num. 16 LISR, D.L. 458 de 2019): exento hasta 2 salarios mínimos mensuales del
 * sector comercio y servicios. Varios años un decreto transitorio subió ese tope.
 */
const MIN_WAGE_COMMERCE: [fromYear: number, monthly: number][] = [
  [2025, 408.8], // desde 1-jun-2025 (el aguinaldo se paga en diciembre)
  [2021, 365.0], // desde 1-ago-2021
  [0, 304.17],
];
const minWageFor = (year: number) => MIN_WAGE_COMMERCE.find(([from]) => year >= from)![1];

export interface AguinaldoRule {
  cap: number;
  /** Texto corto para la nota legal. */
  basis: string;
  verified: boolean;
  source?: LegalNote['source'];
}

const AGUINALDO_DECREES: Record<number, { cap: number; source?: LegalNote['source'] }> = {
  2021: { cap: 1100, source: SRC.aguinaldoHistoria },
  2022: { cap: 1500, source: SRC.aguinaldo2022 },
  2023: { cap: 1500, source: SRC.aguinaldo2023 },
  2024: { cap: 1500, source: SRC.aguinaldo2024 },
  2025: { cap: 1500, source: SRC.aguinaldo2025 },
  2026: { cap: 1500, source: SRC.aguinaldo2026 },
};

export function aguinaldoRuleFor(year: number): AguinaldoRule {
  const decree = AGUINALDO_DECREES[year];
  if (decree) return { cap: decree.cap, basis: `Decreto transitorio ${year}`, verified: true, source: decree.source };
  const wage = minWageFor(year);
  return {
    cap: Math.round(wage * 2 * 100) / 100,
    basis: `Art. 4 num. 16: 2 salarios mínimos de comercio (2 × $${wage.toFixed(2)})`,
    verified: false,
    source: SRC.art4,
  };
}

function aguinaldoNote(year: number): LegalNote {
  const r = aguinaldoRuleFor(year);
  const cap = `$${r.cap.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  return r.verified
    ? {
        kind: 'cambio',
        title: `Aguinaldo exento hasta ${cap} (${year})`,
        detail: `${r.basis}: los primeros ${cap} de aguinaldo no pagan renta; solo el excedente se suma a la renta imponible.`,
        source: r.source,
      }
    : {
        kind: 'aviso',
        title: `Aguinaldo exento hasta ${cap} (por confirmar)`,
        detail: `No encontramos decreto transitorio para ${year}, así que se aplica la ley base: ${r.basis}. Si hubo decreto, el tope puede ser mayor.`,
        source: r.source,
      };
}

/** Cambios por año (además de la nota de aguinaldo, que se genera para todos). */
const YEAR_OVERRIDES: Record<number, { notes: LegalNote[] }> = {
  2025: {
    notes: [
      {
        kind: 'cambio',
        title: 'Reforma Art. 37: exento sube a $6,600',
        detail:
          'Aprobada el 30 de abril de 2025 y vigente desde el 8 de mayo: el tramo exento pasa de $4,064 a $6,600 anuales ($550 al mes). Los tramos III y IV no cambian.',
        source: SRC.reforma2025,
      },
      {
        kind: 'cambio',
        title: 'Nuevas tablas de retención (Decreto Ejecutivo No. 10)',
        detail: 'Desde mayo de 2025 no se retiene renta a salarios de hasta $550 mensuales.',
        source: SRC.tablas2025,
      },
      {
        kind: 'aviso',
        title: 'Cambio de tabla a mitad de año',
        detail:
          'La reforma entró en vigencia el 8 de mayo. Arriba puedes elegir cómo calcular el F11: tabla nueva todo el año (la que usa la app por defecto), proporcional por meses o la tabla anterior. Confirma con Hacienda o un contador cuál aplica.',
      },
    ],
  },
};

/**
 * Cambios de tabla del Art. 37 a mitad de un ejercicio. Para un cambio futuro basta con agregar una
 * entrada: el año tendrá las tres opciones de cálculo.
 */
const MID_YEAR_TABLE_CHANGES: {
  year: number;
  /** Meses del año con la tabla anterior (ene–abr = 4). */
  monthsBefore: number;
  before: { label: string; brackets: TaxBracket[] };
  after: { label: string; brackets: TaxBracket[] };
}[] = [
  {
    year: 2025,
    monthsBefore: 4,
    before: { label: 'tabla 2011', brackets: ANNUAL_TAX_BRACKETS_2011 },
    after: { label: 'tabla reformada', brackets: ANNUAL_TAX_BRACKETS },
  },
];

function tableOptionsFor(year: number, brackets: TaxBracket[], label: string): TableOption[] {
  const change = MID_YEAR_TABLE_CHANGES.find((c) => c.year === year);
  if (!change) return [{ id: 'unica', label, detail: label, parts: [{ brackets, weight: 1 }] }];
  const after = (12 - change.monthsBefore) / 12;
  return [
    {
      id: 'nueva',
      label: `${change.after.label[0].toUpperCase()}${change.after.label.slice(1)} todo el año`,
      detail: `Todo ${year} con la ${change.after.label}.`,
      parts: [{ brackets: change.after.brackets, weight: 1 }],
    },
    {
      id: 'proporcional',
      label: 'Proporcional por meses',
      detail: `${change.monthsBefore} meses con la ${change.before.label} y ${12 - change.monthsBefore} con la ${change.after.label}.`,
      parts: [
        { brackets: change.after.brackets, weight: after },
        { brackets: change.before.brackets, weight: 1 - after },
      ],
    },
    {
      id: 'anterior',
      label: `${change.before.label[0].toUpperCase()}${change.before.label.slice(1)} todo el año`,
      detail: `Todo ${year} con la ${change.before.label}.`,
      parts: [{ brackets: change.before.brackets, weight: 1 }],
    },
  ];
}

export function rulesForYear(year: number, tableId?: string): YearRules {
  const reformed = year >= REFORM_2025_YEAR;
  const override = YEAR_OVERRIDES[year];
  const notes = [...(override?.notes ?? []), aguinaldoNote(year)];
  if (!reformed)
    notes.unshift({
      kind: 'ley',
      title: 'Tabla del Art. 37 de 2011',
      detail: 'Para este ejercicio aplica la tabla anterior a la reforma de 2025: exento hasta $4,064.',
    });
  const baseLabel = reformed ? 'Reforma 2025: exento hasta $6,600 anuales' : 'Tabla 2011: exento hasta $4,064 anuales';
  const tableOptions = tableOptionsFor(year, reformed ? ANNUAL_TAX_BRACKETS : ANNUAL_TAX_BRACKETS_2011, baseLabel);
  const option = tableOptions.find((o) => o.id === tableId) ?? tableOptions[0];
  const main = option.parts.reduce((a, b) => (b.weight > a.weight ? b : a));
  return {
    year,
    brackets: main.brackets,
    bracketsLabel: tableOptions.length > 1 ? option.detail : baseLabel,
    tableOptions,
    tableId: option.id,
    medicalCap: 800,
    eduCap: 800,
    aguinaldoCap: aguinaldoRuleFor(year).cap,
    fixedSalaryDeduction: 1600,
    fixedSalaryDeductionLimit: 9100,
    notes: [...notes, ...BASE_NOTES],
  };
}
