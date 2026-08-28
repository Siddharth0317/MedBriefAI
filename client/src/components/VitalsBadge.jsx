import React from 'react';
import { Activity, Heart, Droplet, Gauge, Wind, Thermometer, AlertCircle } from 'lucide-react';

/**
 * Metric configuration for clinical vitals
 */
const VITAL_CONFIGS = {
  bloodGlucose: {
    label: 'Blood Glucose',
    icon: Droplet,
    unit: 'mg/dL',
    isAbnormal: (val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && (num < 70 || num > 140);
    },
    abnormalLabel: 'High',
  },
  bloodPressure: {
    label: 'Blood Pressure',
    icon: Gauge,
    unit: 'mmHg',
    isAbnormal: (val) => {
      const systolic = parseInt(val.split('/')[0], 10);
      return !isNaN(systolic) && (systolic >= 130 || systolic < 90);
    },
    abnormalLabel: 'Elevated',
  },
  heartRate: {
    label: 'Heart Rate',
    icon: Heart,
    unit: 'bpm',
    isAbnormal: (val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && (num < 60 || num > 100);
    },
    abnormalLabel: 'Abnormal',
  },
  cholesterol: {
    label: 'Cholesterol',
    icon: Activity,
    unit: 'mg/dL',
    isAbnormal: (val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 200;
    },
    abnormalLabel: 'High',
  },
  oxygenSaturation: {
    label: 'SpO2 Oxygen',
    icon: Wind,
    unit: '%',
    isAbnormal: (val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num < 95;
    },
    abnormalLabel: 'Low',
  },
  temperature: {
    label: 'Body Temp',
    icon: Thermometer,
    unit: '°F',
    isAbnormal: (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 100.4;
    },
    abnormalLabel: 'Fever',
  },
};

/**
 * VitalsBadge Component
 * Displays individual clinical vital/lab metric with abnormal badges,
 * no text truncation, and full responsiveness.
 * @param {Object} props
 * @param {string} props.vitalKey - Key name in extractedVitals
 * @param {string} props.value - Value string
 */
const VitalsBadge = ({ vitalKey, value }) => {
  if (!value) return null;

  const config = VITAL_CONFIGS[vitalKey] || {
    label: vitalKey.replace(/([A-Z])/g, ' $1').trim(),
    icon: Activity,
    unit: '',
    isAbnormal: () => false,
  };

  const IconComponent = config.icon;
  const abnormal = config.isAbnormal(value);

  return (
    <div
      className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-2 ${
        abnormal
          ? 'bg-red-50/90 border-red-200 text-red-950 shadow-xs'
          : 'bg-slate-50/90 border-slate-200/90 text-slate-800'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              abnormal ? 'bg-red-100 text-red-600' : 'bg-cyan-100 text-cyan-700'
            }`}
          >
            <IconComponent className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-600 leading-tight">
            {config.label}
          </span>
        </div>

        {abnormal && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 flex-shrink-0">
            {config.abnormalLabel || 'Alert'}
          </span>
        )}
      </div>

      <div className="pt-1">
        <div className="text-base font-extrabold tracking-tight text-slate-900 break-words">
          {value}
        </div>
      </div>
    </div>
  );
};

export default VitalsBadge;
