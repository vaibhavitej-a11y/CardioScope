"""Request/response models for POST /api/predict.

PatientInput mirrors ml/artifacts/feature_schema.json (54 features, dataset
column names as JSON keys via aliases); the response models mirror the frozen
contract in web/src/api/types.ts. api/tests/test_schema_parity.py fails if
either mirror drifts.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

YesNo = Literal["N", "Y"]
Bbb = Literal["LBBB", "N", "RBBB"]
SexValue = Literal["Female", "Male"]
RegionRwma = Literal["0", "1", "2", "3", "4"]
Vhd = Literal["Moderate", "N", "Severe", "mild"]


class PatientInput(BaseModel):
    """The 54 model inputs, keyed by dataset column name.

    extra="forbid" is requirement 1d's boundary guard: Cath, LAD, LCX, RCA
    (and any unknown column) are rejected with 422 before a model sees them.
    """

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    age: float = Field(alias="Age")
    weight: float = Field(alias="Weight")
    length: float = Field(alias="Length")
    sex: SexValue = Field(alias="Sex")
    bmi: float = Field(alias="BMI")
    dm: float = Field(alias="DM")
    htn: float = Field(alias="HTN")
    current_smoker: float = Field(alias="Current Smoker")
    ex_smoker: float = Field(alias="EX-Smoker")
    fh: float = Field(alias="FH")
    obesity: YesNo = Field(alias="Obesity")
    crf: YesNo = Field(alias="CRF")
    cva: YesNo = Field(alias="CVA")
    airway_disease: YesNo = Field(alias="Airway disease")
    thyroid_disease: YesNo = Field(alias="Thyroid Disease")
    chf: YesNo = Field(alias="CHF")
    dlp: YesNo = Field(alias="DLP")
    bp: float = Field(alias="BP")
    pr: float = Field(alias="PR")
    edema: float = Field(alias="Edema")
    weak_peripheral_pulse: YesNo = Field(alias="Weak Peripheral Pulse")
    lung_rales: YesNo = Field(alias="Lung rales")
    systolic_murmur: YesNo = Field(alias="Systolic Murmur")
    diastolic_murmur: YesNo = Field(alias="Diastolic Murmur")
    typical_chest_pain: float = Field(alias="Typical Chest Pain")
    dyspnea: YesNo = Field(alias="Dyspnea")
    function_class: float = Field(alias="Function Class")
    atypical: YesNo = Field(alias="Atypical")
    nonanginal: YesNo = Field(alias="Nonanginal")
    lowth_ang: YesNo = Field(alias="LowTH Ang")
    q_wave: float = Field(alias="Q Wave")
    st_elevation: float = Field(alias="St Elevation")
    st_depression: float = Field(alias="St Depression")
    tinversion: float = Field(alias="Tinversion")
    lvh: YesNo = Field(alias="LVH")
    poor_r_progression: YesNo = Field(alias="Poor R Progression")
    bbb: Bbb = Field(alias="BBB")
    fbs: float = Field(alias="FBS")
    cr: float = Field(alias="CR")
    tg: float = Field(alias="TG")
    ldl: float = Field(alias="LDL")
    hdl: float = Field(alias="HDL")
    bun: float = Field(alias="BUN")
    esr: float = Field(alias="ESR")
    hb: float = Field(alias="HB")
    k: float = Field(alias="K")
    na: float = Field(alias="Na")
    wbc: float = Field(alias="WBC")
    lymph: float = Field(alias="Lymph")
    neut: float = Field(alias="Neut")
    plt: float = Field(alias="PLT")
    ef_tte: float = Field(alias="EF-TTE")
    region_rwma: RegionRwma = Field(alias="Region RWMA")
    vhd: Vhd = Field(alias="VHD")


class Contribution(BaseModel):
    feature: str
    value: float


class ShapBreakdown(BaseModel):
    contributions: list[Contribution]
    label: str


class Vessels(BaseModel):
    LAD: float
    LCX: float
    RCA: float


class ShapMap(BaseModel):
    cad: ShapBreakdown
    LAD: ShapBreakdown
    LCX: ShapBreakdown
    RCA: ShapBreakdown


class Prediction(BaseModel):
    """Response body — identical to web/src/api/types.ts Prediction."""

    cad: float
    vessels: Vessels
    shap: ShapMap
