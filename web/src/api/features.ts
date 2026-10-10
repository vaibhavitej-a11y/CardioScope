/**
 * Data-driven catalogue of the 54 model inputs.
 *
 * Derived from ml/artifacts/feature_schema.json v1 — the artifact training
 * emits — so names, ranges and categories are the same set the models were
 * fitted on (54 = 59 published columns − 4 targets − 1 constant, per
 * ml/tests/test_leakage.py). That JSON stays the source of truth on the
 * Python side; this module exists because the form also needs labels, units
 * and grouping, which the schema does not carry, and because the browser
 * should not have to reach across the ml/ package boundary.
 *
 * Consumed by components/PatientForm (the input workflow the demo needs) and
 * by components/ExplainPanel (requirement 3c pairs a measurement with
 * its contribution). Adding a clinical feature therefore means adding one row
 * here plus one column in the dataset — no layout rewrite, which is the
 * extensibility clause in the traceability doc.
 */

export type FeatureGroup =
  | 'Demographics'
  | 'Risk factors'
  | 'Comorbidity'
  | 'Examination'
  | 'Symptoms'
  | 'ECG'
  | 'Laboratory'
  | 'Echocardiography'

/** Display order of the groups in the form. */
export const FEATURE_GROUPS: readonly FeatureGroup[] = [
  'Demographics',
  'Risk factors',
  'Comorbidity',
  'Examination',
  'Symptoms',
  'ECG',
  'Laboratory',
  'Echocardiography',
]

interface BaseFeature {
  /** Dataset column name — the key SHAP uses in contribution.feature. */
  name: string
  /** Short human label for the form and the dashboard. */
  label: string
  group: FeatureGroup
}

export interface NumericFeature extends BaseFeature {
  kind: 'number'
  unit?: string
  min: number
  max: number
  step: number
  default: number
}

export interface CategoryFeature extends BaseFeature {
  kind: 'category'
  options: readonly string[]
  default: string
}

export type FeatureDef = NumericFeature | CategoryFeature

/**
 * Value an input can hold in the patient store. Kept structurally identical
 * to store/patientStore's FeatureValue on purpose: this module must not
 * import the store, or the api layer would depend on UI state.
 */
export type InputValue = number | string | boolean

const num = (
  name: string,
  label: string,
  group: FeatureGroup,
  min: number,
  max: number,
  step: number,
  def: number,
  unit?: string,
): NumericFeature => ({ name, label, group, kind: 'number', min, max, step, default: def, unit })

const cat = (
  name: string,
  label: string,
  group: FeatureGroup,
  options: readonly string[],
  def: string,
): CategoryFeature => ({ name, label, group, kind: 'category', options, default: def })

/** `N`/`Y` options where "absent" is the sensible starting state. */
const YES_NO = ['N', 'Y'] as const

export const FEATURES: readonly FeatureDef[] = [
  num('Age', 'Age', 'Demographics', 30, 86, 1, 59, 'yr'),
  num('Weight', 'Weight', 'Demographics', 48, 120, 1, 74, 'kg'),
  num('Length', 'Height', 'Demographics', 140, 188, 1, 165, 'cm'),
  cat('Sex', 'Sex', 'Demographics', ['Female', 'Male'], 'Male'),
  num('BMI', 'BMI', 'Demographics', 18.1, 40.9, 0.1, 27.2, 'kg/m²'),

  num('DM', 'Diabetes mellitus', 'Risk factors', 0, 1, 1, 0),
  num('HTN', 'Hypertension', 'Risk factors', 0, 1, 1, 1),
  num('Current Smoker', 'Current smoker', 'Risk factors', 0, 1, 1, 0),
  num('EX-Smoker', 'Ex-smoker', 'Risk factors', 0, 1, 1, 0),
  num('FH', 'Family history', 'Risk factors', 0, 1, 1, 0),
  cat('Obesity', 'Obesity', 'Risk factors', YES_NO, 'N'),
  cat('DLP', 'Dyslipidaemia', 'Risk factors', YES_NO, 'N'),

  cat('CRF', 'Chronic renal failure', 'Comorbidity', YES_NO, 'N'),
  cat('CVA', 'Cerebrovascular accident', 'Comorbidity', YES_NO, 'N'),
  cat('Airway disease', 'Airway disease', 'Comorbidity', YES_NO, 'N'),
  cat('Thyroid Disease', 'Thyroid disease', 'Comorbidity', YES_NO, 'N'),
  cat('CHF', 'Congestive heart failure', 'Comorbidity', YES_NO, 'N'),

  num('BP', 'Blood pressure', 'Examination', 90, 190, 1, 130, 'mmHg'),
  num('PR', 'Pulse rate', 'Examination', 50, 110, 1, 75, 'bpm'),
  num('Edema', 'Edema', 'Examination', 0, 1, 1, 0),
  cat('Weak Peripheral Pulse', 'Weak peripheral pulse', 'Examination', YES_NO, 'N'),
  cat('Lung rales', 'Lung rales', 'Examination', YES_NO, 'N'),
  cat('Systolic Murmur', 'Systolic murmur', 'Examination', YES_NO, 'N'),
  cat('Diastolic Murmur', 'Diastolic murmur', 'Examination', YES_NO, 'N'),

  num('Typical Chest Pain', 'Typical chest pain', 'Symptoms', 0, 1, 1, 1),
  cat('Dyspnea', 'Dyspnea', 'Symptoms', YES_NO, 'N'),
  num('Function Class', 'NYHA function class', 'Symptoms', 0, 3, 1, 1),
  cat('Atypical', 'Atypical chest pain', 'Symptoms', YES_NO, 'N'),
  cat('Nonanginal', 'Non-anginal pain', 'Symptoms', YES_NO, 'N'),
  cat('LowTH Ang', 'Low-threshold angina', 'Symptoms', YES_NO, 'N'),

  num('Q Wave', 'Q wave', 'ECG', 0, 1, 1, 0),
  num('St Elevation', 'ST elevation', 'ECG', 0, 1, 1, 0),
  num('St Depression', 'ST depression', 'ECG', 0, 1, 1, 0),
  num('Tinversion', 'T-wave inversion', 'ECG', 0, 1, 1, 0),
  cat('LVH', 'LV hypertrophy', 'ECG', YES_NO, 'N'),
  cat('Poor R Progression', 'Poor R progression', 'ECG', YES_NO, 'N'),
  cat('BBB', 'Bundle branch block', 'ECG', ['LBBB', 'N', 'RBBB'], 'N'),

  num('FBS', 'Fasting blood sugar', 'Laboratory', 62, 400, 1, 119, 'mg/dL'),
  num('CR', 'Creatinine', 'Laboratory', 0.5, 2.2, 0.1, 1.1, 'mg/dL'),
  num('TG', 'Triglycerides', 'Laboratory', 37, 1050, 1, 150, 'mg/dL'),
  num('LDL', 'LDL cholesterol', 'Laboratory', 18, 232, 1, 105, 'mg/dL'),
  num('HDL', 'HDL cholesterol', 'Laboratory', 15.9, 111, 0.1, 40, 'mg/dL'),
  num('BUN', 'Blood urea nitrogen', 'Laboratory', 6, 52, 0.1, 18, 'mg/dL'),
  num('ESR', 'ESR', 'Laboratory', 1, 90, 1, 19, 'mm/hr'),
  num('HB', 'Haemoglobin', 'Laboratory', 8.9, 17.6, 0.1, 13.2, 'g/dL'),
  num('K', 'Potassium', 'Laboratory', 3, 6.6, 0.1, 4.2, 'mmol/L'),
  num('Na', 'Sodium', 'Laboratory', 128, 156, 1, 141, 'mmol/L'),
  num('WBC', 'White blood cells', 'Laboratory', 3700, 18000, 100, 7600, '/µL'),
  num('Lymph', 'Lymphocytes', 'Laboratory', 7, 60, 1, 32, '%'),
  num('Neut', 'Neutrophils', 'Laboratory', 32, 89, 1, 60, '%'),
  num('PLT', 'Platelets', 'Laboratory', 25, 742, 1, 221, '×10³/µL'),

  num('EF-TTE', 'Ejection fraction (EF-TTE)', 'Echocardiography', 15, 60, 1, 47, '%'),
  cat('Region RWMA', 'Regional wall motion', 'Echocardiography', ['0', '1', '2', '3', '4'], '0'),
  cat('VHD', 'Valvular heart disease', 'Echocardiography', ['N', 'mild', 'Moderate', 'Severe'], 'N'),
]

const BY_NAME = new Map(FEATURES.map((f) => [f.name.toLowerCase(), f]))

/**
 * Case-insensitive lookup.
 *
 * SHAP contribution keys are display strings ("ST Elevation") while the
 * dataset column is "St Elevation", so the dashboard must not compare
 * literally.
 */
export function findFeature(name: string): FeatureDef | undefined {
  return BY_NAME.get(name.trim().toLowerCase())
}

/** Initial form state: population means and normal findings from the schema. */
export function defaultInputs(): Record<string, InputValue> {
  const out: Record<string, InputValue> = {}
  for (const feature of FEATURES) {
    out[feature.name] = feature.default
  }
  return out
}

/**
 * Coerce what the form collected into the shape POST /api/predict expects —
 * numeric columns arrive as numbers even though the DOM hands back strings.
 */
export function collectInputs(
  inputs: Record<string, InputValue>,
): Record<string, number | string> {
  const out: Record<string, number | string> = {}
  for (const feature of FEATURES) {
    const raw = inputs[feature.name]
    const value = raw === undefined ? feature.default : raw
    if (feature.kind === 'number') {
      const parsed = typeof value === 'number' ? value : Number(value)
      out[feature.name] = Number.isFinite(parsed) ? parsed : feature.default
    } else {
      out[feature.name] = String(value)
    }
  }
  return out
}

/**
 * Format a measurement for requirement 3c's "physiological measurement …
 * alongside its contribution": number plus unit, or the raw category label.
 * Returns null when the feature is unknown (a SHAP key with no column).
 */
export function formatFeatureValue(
  name: string,
  raw: InputValue,
): string | null {
  const feature = findFeature(name)
  if (!feature) return typeof raw === 'number' ? String(raw) : String(raw)

  if (feature.kind === 'category') return String(raw)

  const value = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(value)) return String(raw)

  // 0/1 numeric columns in the schema (DM, HTN, St Elevation, …) are yes/no
  // findings; printing "0" beside a contribution reads like a measurement.
  if (feature.min === 0 && feature.max === 1 && feature.step === 1) {
    return value >= 1 ? 'Yes' : 'No'
  }

  const decimals = feature.step < 1 ? 1 : 0
  const shown = value.toFixed(decimals)
  return feature.unit ? `${shown} ${feature.unit}` : shown
}
