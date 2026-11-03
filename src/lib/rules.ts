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

export interface YearRules {
  year: number;
  brackets: TaxBracket[];
  bracketsLabel: string;
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
    title: 'Obligación de declarar',
    detail: 'Asalariados con ingresos de $60,000 o menos declaran solo si les toca pagar o si quieren su devolución.',
    source: SRC.guiaMH,
  },
];

const AGUINALDO_NOTE = (year: number, source?: LegalNote['source']): LegalNote => ({
  kind: 'cambio',
  title: `Aguinaldo exento hasta $1,500 (${year})`,
  detail: 'Decreto transitorio para este ejercicio: los primeros $1,500 de aguinaldo no pagan renta.',
  source,
});

const AGUINALDO_UNVERIFIED: LegalNote = {
  kind: 'aviso',
  title: 'Aguinaldo: límite por confirmar',
  detail:
    'No verificamos el decreto de aguinaldo de este año. La app usa el mismo tope de $1,500; confírmalo antes de declarar.',
};

/** Cambios por año. Lo que no se define aquí hereda los valores base. */
const YEAR_OVERRIDES: Record<number, { notes: LegalNote[]; aguinaldoVerified?: boolean }> = {
  2024: { notes: [AGUINALDO_NOTE(2024, SRC.aguinaldo2024)], aguinaldoVerified: true },
  2025: {
    aguinaldoVerified: true,
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
        title: 'Tabla aplicada al año completo',
        detail:
          'La app usa la tabla reformada para todo el ejercicio 2025. Confirma con Hacienda o un contador cómo se trata enero–abril.',
      },
      AGUINALDO_NOTE(2025, SRC.aguinaldo2025),
    ],
  },
  2026: { notes: [AGUINALDO_NOTE(2026, SRC.aguinaldo2026)], aguinaldoVerified: true },
};

export function rulesForYear(year: number): YearRules {
  const reformed = year >= REFORM_2025_YEAR;
  const override = YEAR_OVERRIDES[year];
  const notes = [...(override?.notes ?? [])];
  if (!override?.aguinaldoVerified) notes.push(AGUINALDO_UNVERIFIED);
  if (!reformed)
    notes.unshift({
      kind: 'ley',
      title: 'Tabla del Art. 37 de 2011',
      detail: 'Para este ejercicio aplica la tabla anterior a la reforma de 2025: exento hasta $4,064.',
    });
  return {
    year,
    brackets: reformed ? ANNUAL_TAX_BRACKETS : ANNUAL_TAX_BRACKETS_2011,
    bracketsLabel: reformed ? 'Reforma 2025: exento hasta $6,600 anuales' : 'Tabla 2011: exento hasta $4,064 anuales',
    medicalCap: 800,
    eduCap: 800,
    aguinaldoCap: 1500,
    fixedSalaryDeduction: 1600,
    fixedSalaryDeductionLimit: 9100,
    notes: [...notes, ...BASE_NOTES],
  };
}
