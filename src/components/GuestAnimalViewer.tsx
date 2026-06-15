import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Printer, ExternalLink, ShieldAlert, LogIn, UserPlus, Heart, Award, Sparkles } from 'lucide-react';
import { IndividualAnimalRecord } from '../types';
import { LivestockService } from '../lib/livestockService';

interface GuestAnimalViewerProps {
  animalRecordId: string;
  onGoToAuth: (mode?: 'login' | 'register') => void;
  onClear: () => void;
}

export function GuestAnimalViewer({ animalRecordId, onGoToAuth, onClear }: GuestAnimalViewerProps) {
  const [animal, setAnimal] = useState<IndividualAnimalRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pass' | 'ancestry' | 'clinical' | 'feeding'>('pass');

  useEffect(() => {
    let active = true;
    const fetchRecord = async () => {
      try {
        setLoading(true);
        setErrorStatus(null);
        const record = await LivestockService.fetchIndividualRecordById(animalRecordId);
        if (!active) return;
        if (record) {
          setAnimal(record);
        } else {
          setErrorStatus('No registered record found for this dynamic health ID inside the VetAxis secure ledger.');
        }
      } catch (err) {
        console.error('Error fetching guest animal record:', err);
        setErrorStatus('Failed to query the cloud ledger database. Please check your credentials or network status.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchRecord();
    return () => {
      active = false;
    };
  }, [animalRecordId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center p-6 text-neutral-800">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-20 h-20 rounded-full border-2 border-[#5a5a40]/30 animate-ping" />
            <div className="h-14 w-14 bg-[#5a5a40] rounded-2xl flex items-center justify-center shadow-md text-white font-serif font-black text-xl">
              VA
            </div>
          </div>
          <h2 className="text-lg font-bold font-serif text-[#5a5a40] mt-2">Checking Medical Ledger...</h2>
          <p className="text-gray-500 text-xs font-mono tracking-wider">RETRIEVING SECURE PASS PORTAL</p>
        </div>
      </div>
    );
  }

  if (errorStatus || !animal) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4 text-neutral-800">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white border border-[#e3dec9] rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-xl"
        >
          <div className="mx-auto w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-xl border border-red-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-black text-stone-900">Ledger Security Error</h3>
          <p className="text-gray-600 text-xs leading-relaxed">{errorStatus}</p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={onClear}
              className="w-full bg-[#5a5a40] hover:bg-[#3e3e2b] text-white py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none shadow-sm"
            >
              Back to Main Portal
            </button>
            <button
              onClick={() => onGoToAuth('login')}
              className="w-full bg-neutral-100 hover:bg-neutral-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border border-neutral-300 shadow-2xs"
            >
              Sign In to Your Workspace
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-neutral-800 py-8 px-4 flex flex-col font-sans">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #guest-printable-collar-tag, #guest-printable-collar-tag * {
            visibility: visible !important;
          }
          #guest-printable-collar-tag {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 320px !important;
            height: auto !important;
            padding: 16px !important;
            border: 2px dashed #000000 !important;
            border-radius: 12px !important;
            background: white !important;
            box-shadow: none !important;
            margin: 0 !important;
            text-align: center !important;
          }
        }
      `}</style>

      {/* Floating Header Actions block */}
      <div className="max-w-3xl w-full mx-auto mb-6">
        <div className="flex items-center justify-between border-b border-[#e3dec9] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-[#5a5a40] rounded-xl flex items-center justify-center text-white font-serif font-black text-sm relative">
              VA
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#fdfbf7]" />
            </div>
            <div>
              <h1 className="font-serif text-base font-black text-[#5a5a40] tracking-tight leading-none">VetAxis ™</h1>
              <span className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">Verified Medical Ledger</span>
            </div>
          </div>

          <button
            onClick={onClear}
            className="text-xs font-bold text-gray-500 hover:text-gray-800 bg-[#f4f1e9] hover:bg-[#eae6d8] py-1.5 px-3 rounded-lg border-none cursor-pointer transition-colors"
          >
            Exit Guest View
          </button>
        </div>

        {/* Dynamic Warning/Sign in Bar */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200 font-mono inline-block">
              ⚠️ GUEST PASSPORT VIEWER
            </span>
            <p className="text-gray-700 text-xs font-medium leading-relaxed">
              Are you the veterinarian, farm manager, or dairy breeder of <span className="font-bold text-gray-900">{animal.name || 'this animal'}</span>? 
              Sign in or create a free account to edit clinical records, schedule vaccinations, or log milking sessions.
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => onGoToAuth('login')}
              className="flex-1 md:flex-none cursor-pointer bg-amber-800 hover:bg-amber-900 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all border-none"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign In
            </button>
            <button
              onClick={() => onGoToAuth('register')}
              className="flex-1 md:flex-none cursor-pointer bg-white hover:bg-neutral-50 text-gray-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-neutral-300 shadow-2xs transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" /> Join Free
            </button>
          </div>
        </div>
      </div>

      {/* Main card box */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white border border-[#e3dec9] rounded-3xl max-w-3xl w-full mx-auto p-6 md:p-8 space-y-6 shadow-xl relative"
      >
        {/* Certificate title block */}
        <div className="border-b border-[#f4f1e9] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex gap-1.5 items-center">
              <span className="text-[10px] uppercase font-black text-emerald-850 tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Verified Veterinary Asset
              </span>
              <span className="text-[9px] uppercase font-mono text-gray-400">
                Live Sync Active
              </span>
            </div>
            <h2 className="font-serif text-2xl font-black text-[#5a5a40]">
              {animal.name || 'Unnamed Animal'}
            </h2>
            <div className="text-gray-500 font-mono text-[10px] flex flex-wrap gap-x-4">
              <span>Dynamic ID: <strong className="text-gray-800">{animal.animalId}</strong></span>
              {animal.earTagNumber && <span>Ear Tag: <strong className="text-emerald-800">{animal.earTagNumber}</strong></span>}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="cursor-pointer bg-[#faf9f3] hover:bg-[#f3eedd] text-gray-700 font-bold py-2 px-4 rounded-xl text-xs border border-[#cfc8b6] shadow-2xs flex items-center justify-center gap-1.5 transition-all text-center"
            >
              <Printer className="w-3.5 h-3.5 text-[#5a5a40]" /> Print Passport Badge
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-[#fafaf7] pb-1 gap-1.5 overflow-x-auto text-xs font-bold">
          {[
            { id: 'pass', label: '🏷️ Passport Card' },
            { id: 'ancestry', label: '🧬 Pedigree & Identity' },
            { id: 'clinical', label: '🩺 Clinical & Vaccines' },
            { id: 'feeding', label: '🌾 lactations & Feeding' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`p-2.5 rounded-xl border-none cursor-pointer transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#5a5a40] text-white shadow-sm font-black'
                  : 'bg-transparent text-gray-500 hover:bg-[#fafcf5] hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Details Box */}
        <div className="space-y-4 text-xs leading-relaxed">
          
          {/* Passport overview */}
          {activeTab === 'pass' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Collar Ear Tag Frame for scanning */}
                <div className="bg-[#fafbf9] border border-[#e3dec9] rounded-3xl p-5 flex flex-col items-center justify-center relative shadow-xs max-w-sm mx-auto w-full">
                  <div id="guest-printable-collar-tag" className="bg-white border-2 border-dashed border-[#5a5a40] rounded-2xl p-5 w-full flex flex-col items-center text-center">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#5a5a40] mb-1">
                      🏷️ VETAXIS DYNAMIC HEALTH TAG
                    </span>

                    <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-150 my-2 shadow-2xs">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                          window.location.origin + '?animalRecordId=' + animal.id
                        )}`}
                        alt="VetAxis QR Code"
                        referrerPolicy="no-referrer"
                        className="w-36 h-36 bg-white block rounded-lg"
                      />
                    </div>

                    <div className="font-serif text-base font-black text-[#5a5a40]">
                      {animal.name || 'Unnamed Animal'}
                    </div>
                    <div className="font-mono text-[9px] text-[#7a766f]">
                      ID: {animal.animalId}
                    </div>
                    {animal.earTagNumber && (
                      <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150 font-mono mt-1 inline-block">
                        NO: {animal.earTagNumber}
                      </div>
                    )}
                    <p className="text-[8px] text-gray-400 mt-2.5 max-w-[190px] leading-tight">
                      Dynamically linked credentials. Changes made by farm vets update on this exact card automatically.
                    </p>
                  </div>
                </div>

                {/* Core profile details */}
                <div className="space-y-4">
                  <div className="bg-[#faf9f3] border border-[#f0ece0] rounded-2xl p-4 space-y-3 shadow-2xs">
                    <h3 className="font-serif font-black text-sm text-[#5a5a40] flex items-center gap-1">
                      👑 Active Status Ticker
                    </h3>
                    <div className="space-y-2 text-[11px] text-gray-700">
                      <div className="flex justify-between items-center py-1 border-b border-[#eae6d8]/50">
                        <span>Current Health:</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          animal.healthStatus === 'Healthy' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-amber-100 text-amber-950'
                        }`}>
                          {animal.healthStatus || 'Healthy'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#eae6d8]/50">
                        <span>Breeding Breed:</span>
                        <span className="font-bold text-gray-900">{animal.breed || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-[#eae6d8]/50">
                        <span>Registered Age:</span>
                        <span className="font-bold text-gray-900">{animal.age || 'Adult'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span>Biological Sex:</span>
                        <span className="font-bold text-gray-900">{animal.sex || 'Female'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-start gap-2.5 text-[11px] text-gray-505 leading-relaxed">
                    <span>📡</span>
                    <p>
                      <strong>Ledger Authentication Proof:</strong> This digital passport is cryptographically mapped to the VetAxis database. Any additions to the clinical records by authorized physicians dynamically reflect on this page in real-time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pedigree & Ancestry detail */}
          {activeTab === 'ancestry' && (
            <div className="space-y-4">
              <div className="bg-[#faf9f5] border border-[#e3dec9] rounded-2xl p-4 space-y-3">
                <span className="text-[10px] uppercase font-black text-[#5a5a40] tracking-wider block border-b border-[#e3dec9] pb-1">
                  🪪 REPRODUCTIVE & PHYSICAL ATTRIBUTES
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-gray-400 block text-[10px] font-medium uppercase font-mono">Date of Birth</span>
                    <strong className="text-gray-800 text-xs">{animal.dob || 'Unknown'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-medium uppercase font-mono">Breed</span>
                    <strong className="text-gray-800 text-xs">{animal.breed || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-medium uppercase font-mono">Horns Info</span>
                    <strong className="text-gray-800 text-xs">{animal.hornStatus || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] font-medium uppercase font-mono">Color/Markings</span>
                    <strong className="text-gray-800 text-xs">{animal.colorMarkings || '-'}</strong>
                  </div>
                </div>
              </div>

              {/* Pedigree ancestry board */}
              <div className="bg-[#fbfcfa] border border-stone-200 rounded-2xl p-5 space-y-3">
                <span className="text-[10px] uppercase font-black text-amber-800 tracking-wider block border-b border-stone-150 pb-1 flex items-center gap-1 font-mono">
                  🧬 THREE-NODE ANCESTRAL PEDIGREE
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5">
                    <strong className="text-[#5a5a40] block text-[11px] mb-1.5 flex items-center gap-1">
                      ♂️ Sire (Father lineage)
                    </strong>
                    <div className="space-y-1 text-[11px]">
                      <div><span className="text-gray-500">Sire ID code:</span> <span className="font-mono font-bold text-gray-800">{animal.sireId || 'Not registered'}</span></div>
                      <div><span className="text-gray-500">Sire Breed:</span> <span className="text-gray-800">{animal.breedOfSire || '-'}</span></div>
                    </div>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5">
                    <strong className="text-rose-800 block text-[11px] mb-1.5 flex items-center gap-1">
                      ♀️ Dam (Mother lineage)
                    </strong>
                    <div className="space-y-1 text-[11px]">
                      <div><span className="text-gray-500">Dam ID code:</span> <span className="font-mono font-bold text-gray-800">{animal.damId || 'Not registered'}</span></div>
                      <div><span className="text-gray-500">Dam Breed:</span> <span className="text-gray-800">{animal.breedOfDam || '-'}</span></div>
                    </div>
                  </div>
                </div>
                {animal.generation && (
                  <div className="text-[11px] text-gray-600 bg-[#faf9f3] border border-[#f0ece0] px-3 py-1.5 rounded-xl inline-block">
                    🧬 Generation Tier Index: <strong className="text-[#5a5a40] font-black">{animal.generation}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Clinical immunization log */}
          {activeTab === 'clinical' && (
            <div className="space-y-4">
              <div className="bg-[#faf9f5] border border-[#e3dec9] rounded-2xl p-4 space-y-3">
                <span className="text-[10px] uppercase font-black text-[#5a5a40] tracking-wider block border-b border-[#e3dec9] pb-1">
                  🩺 VET DIAGNOSIS & INSPECTOR LOGS
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-mono font-medium">Body Weight</span>
                    <strong className="text-gray-800 text-xs">{animal.bodyWeight ? `${animal.bodyWeight} kg` : '-'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-mono font-medium">BCS Condition</span>
                    <strong className="text-gray-800 text-xs">{animal.bcs || '-'} / 5</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-mono font-medium">Height at Withers</span>
                    <strong className="text-gray-800 text-xs">{animal.heightAtWithers || '-'} info</strong>
                  </div>
                </div>
              </div>

              {/* Vaccine logs */}
              <div className="bg-white border rounded-2xl p-4 space-y-3 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#565655] tracking-widest block border-b pb-1 font-mono">
                  💉 OFFICIAL IMMUNIZATION RECORD
                </span>
                {animal.vaccinationRecords && animal.vaccinationRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b font-bold text-gray-400">
                          <th className="pb-2">Vaccine Item</th>
                          <th className="pb-2">Immunization Date</th>
                          <th className="pb-2">Dosage Amount</th>
                          <th className="pb-2">Verified Vet</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {animal.vaccinationRecords.map((vax, index) => (
                          <tr key={index} className="hover:bg-neutral-50/50">
                            <td className="py-2.5 font-bold text-neutral-800">{vax.vaccineName || '-'}</td>
                            <td className="py-2.5 text-gray-600 font-mono">{vax.dateAdministered || '-'}</td>
                            <td className="py-2.5 text-gray-600">{vax.dosage || '-'}</td>
                            <td className="py-2.5 text-emerald-800 font-extrabold flex items-center gap-1">
                              <Heart className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600" /> {vax.administeredBy || 'Resident Vet'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-gray-400 italic py-4 text-center bg-stone-50 rounded-xl leading-relaxed">
                    No active vaccinations logged inside the cloud ledger schema.
                  </div>
                )}
              </div>

              {/* Health logs */}
              <div className="bg-white border rounded-2xl p-4 space-y-3 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#565655] tracking-widest block border-b pb-1 font-mono">
                  🩺 MEDICATIONS & INTERVENTIONS HISTORIES
                </span>
                {animal.healthRecords && animal.healthRecords.length > 0 ? (
                  <div className="space-y-2">
                    {animal.healthRecords.map((item, idx) => (
                      <div key={idx} className="bg-stone-55 p-3 rounded-xl border border-neutral-150 text-[11px] space-y-1">
                        <div className="flex justify-between font-bold text-[#5a5a40]">
                          <span>Analysis: {item.diagnosis || 'General Fitness check'}</span>
                          <span className="font-mono text-gray-400">{item.dateDiagnosed || '-'}</span>
                        </div>
                        <p className="text-gray-600">
                          <strong>Active treatments:</strong> {item.treatmentPlan || 'None'}
                        </p>
                        <div className="text-[10px] text-gray-500 font-medium">
                          <strong>Licensed Practitioner:</strong> {item.treatedBy || 'Farm Vet'} (Condition status: <span className="text-emerald-700 font-bold">{item.status || 'Cleared'}</span>)
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 italic py-4 text-center bg-stone-50 rounded-xl">
                    No medical incidents or clinical operations registered.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lactation & milking production */}
          {activeTab === 'feeding' && (
            <div className="space-y-4">
              {animal.sex === 'Female' || !animal.sex ? (
                <div className="bg-emerald-50/10 border border-emerald-150 rounded-2xl p-4 space-y-3">
                  <span className="text-[10px] uppercase font-black text-emerald-850 tracking-wider block border-b border-emerald-150 pb-1.5 flex items-center gap-1 font-mono">
                    🥛 DAILY MILK COLLECTION ARCHIVES
                  </span>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-100 text-center shadow-2xs">
                      <strong className="text-gray-400 text-[9px] block uppercase font-black font-mono">☀️ Morning collection</strong>
                      <span className="text-base font-black text-[#5a5a40]">{animal.morningMilk ? `${animal.morningMilk} kg` : '0 kg'}</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-100 text-center shadow-2xs">
                      <strong className="text-gray-400 text-[9px] block uppercase font-black font-mono">🌙 Evening collection</strong>
                      <span className="text-base font-black text-[#5a5a40]">{animal.eveningMilk ? `${animal.eveningMilk} kg` : '0 kg'}</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-100 text-center shadow-2xs">
                      <strong className="text-gray-400 text-[9px] block uppercase font-black font-mono">🥛 Total Day Output</strong>
                      <span className="text-base font-black text-emerald-800">{animal.totalMilk ? `${animal.totalMilk} kg` : '0 kg'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-stone-500 italic text-center">
                  Milk yield archives are not available as this animal gender is registered as Male/Neutered.
                </div>
              )}

              {/* Nutrition & feeding diet */}
              <div className="bg-[#faf9f5] border border-[#e3dec9] rounded-2xl p-4 space-y-3">
                <span className="text-[10px] uppercase font-black text-[#5a5a40] tracking-wider block border-b border-[#e3dec9] pb-1 font-mono">
                  🌾 FEED COMPOSITION DIETARY ANALYSIS
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[9px] font-mono">Feeding Group</span>
                    <strong className="text-gray-800 text-xs">{animal.feedingGroup || 'High yield grass formula'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] font-mono">Concentrates</span>
                    <strong className="text-gray-800 text-xs">{animal.dailyConcentrate || '-'} kg</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] font-mono">Green Fodders</span>
                    <strong className="text-gray-800 text-xs">{animal.greenFodder || '-'} kg</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] font-mono">Dry Fodders</span>
                    <strong className="text-gray-800 text-xs">{animal.dryFodder || '-'} kg</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] font-mono">Minerals Mix</span>
                    <strong className="text-gray-800 text-xs">{animal.mineralMixture || '-'} kg</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] font-mono">Daily Water Intake</span>
                    <strong className="text-gray-800 text-xs">{animal.waterIntake || '-'} Liters</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Guest View Footer Branding */}
        <div className="pt-4 border-t border-[#f4f1e9] flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1 font-medium font-serif text-xs">
            🛡️ VetAxis Digital Ledger Registry • {new Date().getFullYear()}
          </span>
          <div className="flex gap-4">
            <span className="font-mono">LEDGER NODE: APPROVED</span>
            <span className="font-mono">VERIFIED ENCRYPTED QR CODE</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
