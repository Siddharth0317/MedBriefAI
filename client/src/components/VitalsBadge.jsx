import React from 'react';
import { Activity, Heart, Droplet, Gauge, Wind, Thermometer } from 'lucide-react';

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
    label: 'Total Cholesterol',
    icon: Activity,
    unit: 'mg/dL',
    isAbnormal: (val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 200;
    },
    abnormalLabel: 'Borderline/High',
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
      className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
        abnormal
          ? 'bg-red-50/80 border-red-200 text-red-950'
          : 'bg-slate-50 border-slate-200/80 text-slate-800'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            abnormal ? 'bg-red-100 text-red-600' : 'bg-cyan-100 text-cyan-700'
          }`}
        >
          <IconComponent className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-slate-500 truncate">
            {config.label}
          </div>
          <div className="text-sm font-bold truncate">
            {value}
          </div>
        </div>
      </div>

      {abnormal && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 flex-shrink-0">
          {config.abnormalLabel || 'Alert'}
        </span>
      )}
    </div>
  );
};

export default VitalsBadge;
