import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  Calendar, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Info, 
  Sparkles, 
  ChevronRight,
  Calculator,
  Lock
} from 'lucide-react';

interface LivestockPublicPortalProps {
  onSignIn: () => void;
  onNavigate: (section: string) => void;
}

export function LivestockPublicPortal({ onSignIn, onNavigate }: LivestockPublicPortalProps) {
  // Interactive Milk Yield Estimator states
  const [animalType, setAnimalType] = useState<'cattle' | 'buffalo'>('cattle');
  const [peakYield, setPeakYield] = useState<number>(22);
  const [daysInMilk, setDaysInMilk] = useState<number>(90);

  // Simple Wood's lactation curve estimation for educational guidance
  const estimatedDailyYield = Math.max(
    4,
    Math.round(
      (peakYield * Math.pow(daysInMilk / 60, 0.2) * Math.exp(-0.003 * (daysInMilk - 60))) * 10
    ) / 10
  );

  const VACCINATION_SCHEDULE = [
    {
      disease: 'Foot and Mouth Disease (FMD)',
      frequency: 'Every 6 Months (Biannual)',
      target: 'Cattle & Buffaloes',
      season: 'Pre-Monsoon & Spring (Feb-March & Sep-Oct)',
      importance: 'Critical nationwide preventive measure'
    },
    {
      disease: 'Hemorrhagic Septicemia (HS / Gal Ghotu)',
      frequency: 'Annual (Once a year)',
      target: 'All Bovine Animals',
      season: 'Before Monsoon onset (May-June)',
      importance: 'Rapidly fatal bacterial septicemia'
    },
    {
      disease: 'Black Quarter (BQ / Chooriyya)',
      frequency: 'Annual',
      target: 'Young Stock (6 months - 2 years)',
      season: 'Early Summer (April-May)',
      importance: 'High-mortality clostridial disease'
    },
    {
      disease: 'Anthrax',
      frequency: 'Annual in endemic pockets',
      target: 'Adult Cattle, Sheep, Goats',
      season: 'Before rainy season',
      importance: 'Zoonotic pathogen requiring strict prophylaxis'
    },
    {
      disease: 'Enterotoxemia (Pulpy Kidney)',
      frequency: 'Every 6 Months',
      target: 'Sheep & Goats',
      season: 'Spring pasture green-up',
      importance: 'Common in rapidly fattening small ruminants'
    }
  ];

  const INDIGENOUS_BREEDS = [
    {
      name: 'Nili-Ravi Buffalo',
      region: 'Punjab (Sutlej & Ravi Valleys)',
      tag: 'The Black Gold of Pakistan',
      yield: '1800 - 3200 Liters / Lactation',
      traits: 'High butterfat content (6.5% - 8%), wall-eyed appearance, docile temperament.'
    },
    {
      name: 'Sahiwal Cattle',
      region: 'Central Punjab (Montgomery / Sahiwal)',
      tag: 'Premier Zebu Milking Breed',
      yield: '2000 - 3500 Liters / Lactation',
      traits: 'Reddish-brown coat, heat tolerance, tick resistance, high milk solids.'
    },
    {
      name: 'Red Sindhi Cattle',
      region: 'Sindh (Karachi & Hyderabad belt)',
      tag: 'Heat-Resilient Tropical Dairy',
      yield: '1700 - 2800 Liters / Lactation',
      traits: 'Deep red coat, compact frame, excellent disease resilience in arid zones.'
    },
    {
      name: 'Kundi Buffalo',
      region: 'Sindh (Indus River basin)',
      tag: 'Fish-Hook Horned Dairy Breed',
      yield: '1600 - 2600 Liters / Lactation',
      traits: 'Jet black coat, characteristic spiral curled horns, high lactation persistence.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* ─── Hero Overview ────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#fcfbf9] via-stone-50 to-[#f4f1e8] rounded-3xl border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] p-6 sm:p-10 shadow-sm relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5a5a40]/10 text-[#5a5a40] text-xs font-black uppercase tracking-wider">
            <span>🐄</span>
            <span>National Dairy &amp; Livestock Intelligence Suite</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-black text-stone-900 tracking-tight leading-tight">
            Livestock Herd Management, Disease Prevention &amp; Farm Ledgers
          </h1>

          <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-medium">
            VetAxis 360 provides commercial dairy operations, pastoral herd owners, and registered livestock veterinarians with centralized records for vaccination calendars, lactation logging, individual ear-tag passports, and farm disease management.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onSignIn}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5a5a40] hover:bg-[#4a4a34] text-white font-bold text-sm border border-b-[3px] border-b-[#303022] shadow-sm transition-all cursor-pointer"
            >
              <span>🔐</span>
              <span>Sign In to Manage Your Farm</span>
            </button>
            <button
              onClick={() => onNavigate('clinical_tools')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-stone-50 text-stone-800 font-bold text-sm border border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad] shadow-xs transition-all cursor-pointer"
            >
              <span>🧮</span>
              <span>Open Veterinary Calculators</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Interactive Educational Tool: Lactation Estimator ──────── */}
      <div className="bg-white rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2 text-[#5a5a40]">
              <Calculator className="w-5 h-5" />
              <h2 className="text-xl font-serif font-black text-stone-900">
                Interactive Lactation Curve Estimator
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Estimate daily milk output based on stage of lactation and peak productivity for dairy cattle and buffaloes.
            </p>
          </div>
          <span className="self-start md:self-auto text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            Free Interactive Tool
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="space-y-5 lg:col-span-2">
            {/* Animal Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
                Species Selection
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => { setAnimalType('cattle'); setPeakYield(22); }}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    animalType === 'cattle'
                      ? 'bg-[#5a5a40] text-white border-[#3e3e2b] shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  🐄 Dairy Cow (Sahiwal / Cross)
                </button>
                <button
                  onClick={() => { setAnimalType('buffalo'); setPeakYield(18); }}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                    animalType === 'buffalo'
                      ? 'bg-[#5a5a40] text-white border-[#3e3e2b] shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  🐃 Dairy Buffalo (Nili-Ravi / Kundi)
                </button>
              </div>
            </div>

            {/* Peak Yield Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-stone-700 mb-1">
                <span>Peak Daily Milk Yield:</span>
                <span className="text-[#5a5a40]">{peakYield} Liters / day</span>
              </div>
              <input
                type="range"
                min="8"
                max="40"
                step="1"
                value={peakYield}
                onChange={(e) => setPeakYield(Number(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#5a5a40]"
              />
              <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                <span>8 Liters</span>
                <span>24 Liters</span>
                <span>40 Liters</span>
              </div>
            </div>

            {/* Days in Milk Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-stone-700 mb-1">
                <span>Days in Milk (DIM):</span>
                <span className="text-[#5a5a40]">{daysInMilk} Days</span>
              </div>
              <input
                type="range"
                min="10"
                max="305"
                step="5"
                value={daysInMilk}
                onChange={(e) => setDaysInMilk(Number(e.target.value))}
                className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#5a5a40]"
              />
              <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                <span>Day 10 (Early)</span>
                <span>Day 150 (Mid)</span>
                <span>Day 305 (Late)</span>
              </div>
            </div>
          </div>

          {/* Result Card */}
          <div className="bg-[#fcfaf5] border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] rounded-2xl p-6 text-center space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#a0522d] bg-[#a0522d]/10 px-2.5 py-0.5 rounded">
              Current Projection
            </span>
            <div className="text-4xl sm:text-5xl font-serif font-black text-stone-800">
              {estimatedDailyYield} <span className="text-base font-normal text-stone-500">L/day</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Estimated current daily yield at <strong>Day {daysInMilk}</strong> of lactation for a target peak of {peakYield} L.
            </p>
            <div className="pt-2 border-t border-[#e3dec9] text-[11px] text-stone-500 font-medium">
              305-Day Cumulative: ~{(estimatedDailyYield * 280).toLocaleString()} Liters
            </div>
          </div>
        </div>
      </div>

      {/* ─── Pakistan National Livestock Vaccination Schedule ───────── */}
      <div className="bg-white rounded-3xl border border-[#e3dec9] border-b-[4px] border-b-[#cdc6ad] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2 text-[#5a5a40]">
            <Calendar className="w-5 h-5" />
            <h2 className="text-xl font-serif font-black text-stone-900">
              Pakistan National Bovine &amp; Small Ruminant Vaccination Protocol
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Authoritative clinical immunoprophylaxis guidelines recognized by provincial livestock departments and field DVM practitioners.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-[#fcfaf5] text-[11px] uppercase font-bold text-stone-600 border-b border-[#e3dec9]">
              <tr>
                <th className="py-3 px-4">Disease / Condition</th>
                <th className="py-3 px-4">Administration Frequency</th>
                <th className="py-3 px-4">Eligible Species</th>
                <th className="py-3 px-4">Optimal Season (PK)</th>
                <th className="py-3 px-4">Clinical Significance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {VACCINATION_SCHEDULE.map((vac, idx) => (
                <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-stone-900">{vac.disease}</td>
                  <td className="py-3.5 px-4 text-[#5a5a40] font-semibold">{vac.frequency}</td>
                  <td className="py-3.5 px-4">{vac.target}</td>
                  <td className="py-3.5 px-4 font-semibold text-amber-800">{vac.season}</td>
                  <td className="py-3.5 px-4 text-stone-500">{vac.importance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Pakistan Indigenous Dairy Breed Profiles ─────────────────── */}
      <div className="space-y-4">
        <div className="border-b border-[#e3dec9] pb-3">
          <h2 className="text-xl font-serif font-black text-stone-900">
            Indigenous Dairy Cattle &amp; Buffalo Genetic Profiles
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Key production traits and environmental adaptations of local Pakistani livestock breeds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {INDIGENOUS_BREEDS.map((breed, idx) => (
            <div 
              key={idx}
              className="bg-white rounded-2xl border border-[#e3dec9] border-b-[3px] border-b-[#cdc6ad] p-5 space-y-2.5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#a0522d] bg-[#a0522d]/10 px-2 py-0.5 rounded">
                  {breed.tag}
                </span>
                <span className="text-[11px] font-semibold text-stone-400">{breed.region}</span>
              </div>
              <h3 className="text-base font-serif font-black text-stone-900">{breed.name}</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                {breed.traits}
              </p>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-[#5a5a40]">
                <span>Lactation Benchmark:</span>
                <span>{breed.yield}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Feature Callout & Sign-in Banner ───────────────────────── */}
      <div className="bg-[#fcfaf5] border border-[#e3dec9] border-b-[5px] border-b-[#cdc6ad] rounded-3xl p-6 sm:p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#5a5a40] text-white flex items-center justify-center mx-auto shadow-sm text-xl">
          🌾
        </div>
        <h3 className="text-xl font-serif font-black text-stone-900">
          Ready to Track Your Own Farm Records?
        </h3>
        <p className="text-xs text-stone-600 max-w-lg mx-auto leading-relaxed">
          Create free farm records, register individual ear-tags with digital medical passports, generate vaccination reminders, and manage multi-worker tasks seamlessly.
        </p>
        <button
          onClick={onSignIn}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5a5a40] hover:bg-[#4a4a34] text-white font-bold text-sm border border-b-[3px] border-b-[#303022] shadow-sm transition-all cursor-pointer"
        >
          <span>🔐</span>
          <span>Register / Sign In for Farm Ledger</span>
        </button>
      </div>

    </div>
  );
}

export default LivestockPublicPortal;
