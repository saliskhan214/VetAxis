import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  LivestockAnimal, 
  LivestockBatch, 
  LivestockTask 
} from '../types';
import { 
  TrendingUp, 
  Activity, 
  ShieldCheck, 
  Info,
  Layers,
  Heart
} from 'lucide-react';

interface FarmAnalyticsDashboardProps {
  animals: LivestockAnimal[];
  batches: LivestockBatch[];
  tasks: LivestockTask[];
}

export default function FarmAnalyticsDashboard({ animals, batches, tasks }: FarmAnalyticsDashboardProps) {
  
  // --- 1. Herd Distribution by Species ---
  const speciesCounts: { [key: string]: number } = {};
  
  // Aggregate individual animals
  animals.forEach(a => {
    speciesCounts[a.species] = (speciesCounts[a.species] || 0) + 1;
  });
  
  // Aggregate batch animal counts
  batches.forEach(b => {
    if (b.status === 'Active') {
      speciesCounts[b.species] = (speciesCounts[b.species] || 0) + b.quantity;
    }
  });

  const speciesData = Object.keys(speciesCounts).map(spec => ({
    name: spec,
    value: speciesCounts[spec]
  }));

  // Theme palettes: Modern heritage olive-slate-amber colors
  const SPECIES_PALETTE = ['#5a5a40', '#cca564', '#7c7c5a', '#3d3e2d', '#ebd0a3', '#bec7aa'];

  // --- 2. Herd Biosafety Health Matrix ---
  const healthStates = {
    Healthy: 0,
    Sick: 0,
    'Under Treatment': 0,
    Quarantined: 0
  };

  animals.forEach(a => {
    if (a.healthStatus in healthStates) {
      healthStates[a.healthStatus as keyof typeof healthStates]++;
    } else {
      healthStates.Healthy++;
    }
  });

  const healthData = Object.keys(healthStates).map(status => ({
    status,
    count: healthStates[status as keyof typeof healthStates],
  }));

  const HEALTH_COLORS: { [key: string]: string } = {
    'Healthy': '#10b981', // emerald
    'Sick': '#ef4444', // red
    'Under Treatment': '#f59e0b', // amber
    'Quarantined': '#8b5cf6' // purple
  };

  // --- 3. Vaccine and Treatment Compliance ---
  const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const totalTasksCount = tasks.length;
  const vaccineCoverageRate = totalTasksCount > 0 
    ? Math.round((completedTasks / totalTasksCount) * 100) 
    : 100;

  // Aggregate clinical actions by dates over the last week/month to generate timelines
  const serviceCategories: { [key: string]: { completed: number; pending: number } } = {
    'Vaccination': { completed: 0, pending: 0 },
    'De-worming': { completed: 0, pending: 0 },
    'Checkup': { completed: 0, pending: 0 },
    'Treatment': { completed: 0, pending: 0 },
  };

  tasks.forEach(t => {
    const isCompleted = t.status === 'Completed';
    // Match common keywords in scheduled services
    let category = 'Checkup';
    if (t.serviceType?.toLowerCase().includes('vac') || t.serviceType?.toLowerCase().includes('booster')) {
      category = 'Vaccination';
    } else if (t.serviceType?.toLowerCase().includes('deworm') || t.serviceType?.toLowerCase().includes('worm')) {
      category = 'De-worming';
    } else if (t.serviceType?.toLowerCase().includes('treat') || t.serviceType?.toLowerCase().includes('sick')) {
      category = 'Treatment';
    }
    
    if (category in serviceCategories) {
      if (isCompleted) serviceCategories[category].completed++;
      else serviceCategories[category].pending++;
    }
  });

  const clinicalActionData = Object.keys(serviceCategories).map(cat => ({
    name: cat,
    Completed: serviceCategories[cat].completed,
    Pending: serviceCategories[cat].pending,
  }));

  // --- 4. Average Demographics / Weights ---
  const weightBySpecies: { [key: string]: { total: number; count: number } } = {};
  animals.forEach(a => {
    const w = parseFloat(String(a.weight));
    if (!isNaN(w) && w > 0) {
      if (!weightBySpecies[a.species]) {
        weightBySpecies[a.species] = { total: 0, count: 0 };
      }
      weightBySpecies[a.species].total += w;
      weightBySpecies[a.species].count++;
    }
  });

  const weightData = Object.keys(weightBySpecies).map(spec => ({
    species: spec,
    averageWeight: Math.round(weightBySpecies[spec].total / weightBySpecies[spec].count)
  }));

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* 4 Block Bento Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-gradient-to-br from-emerald-50 to-[#faf7f0] border border-emerald-100 rounded-2xl p-4.5 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Biosafety Cleared</span>
            <span className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-sans font-black text-emerald-950 mt-1.5">
            {animals.length > 0 ? Math.round((healthStates.Healthy / animals.length) * 100) : 100}%
          </p>
          <p className="text-[9px] font-semibold text-zinc-550 mt-1">Percentage of clinically healthy registered stock.</p>
        </div>

        <div className="bg-gradient-to-br from-[#faf7f0] to-[#fcf9f2] border border-[#e3dec9] rounded-2xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-[#5a5a40] tracking-wider">Immunization compliance</span>
            <span className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-sans font-black text-[#5a5a40] mt-1.5">{vaccineCoverageRate}%</p>
          <p className="text-[9px] font-semibold text-zinc-550 mt-1">{completedTasks} completed clinical tasks & immunizations.</p>
        </div>

        <div className="bg-gradient-to-br from-[#faf7f0] to-[#fcf9f2] border border-[#e3dec9] rounded-2xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-[#5a5a40] tracking-wider">Total Livestock Units</span>
            <span className="p-1.5 bg-[#5a5a40]/15 text-[#5a5a40] rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-sans font-black text-[#3d3e2d] mt-1.5">
            {animals.length + batches.reduce((acc, b) => acc + (b.status === 'Active' ? b.quantity : 0), 0)}
          </p>
          <p className="text-[9px] font-semibold text-zinc-550 mt-1">{animals.length} specimens tracked individually.</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-[#faf7f0] border border-red-100 rounded-2xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-red-800 tracking-wider">Critical Path Alerts</span>
            <span className="p-1.5 bg-red-100 text-red-500 rounded-lg">
              <Activity className="w-4 h-4 text-red-600 animate-pulse" />
            </span>
          </div>
          <p className="text-2xl font-sans font-black text-red-950 mt-1.5">{pendingTasks}</p>
          <p className="text-[9px] font-semibold text-zinc-550 mt-1">Pending vaccinations and clinical booster tasks.</p>
        </div>

      </div>

      {/* Recharts Diagrams bento-grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart A: Herd Distribution by Species */}
        <div className="bg-white border border-[#e3dec9] rounded-3xl p-5 md:p-6 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="font-serif font-black text-sm text-[#5a5a40] flex items-center gap-1.5">
              <span>🐑</span> Herd Distribution Categories
            </h4>
            <p className="text-[10px] text-zinc-650 leading-relaxed mt-0.5">Aggregated individual tags and commercial poultry flocks count.</p>
          </div>

          <div className="h-64 w-full">
            {speciesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                No livestock records have been added to this farm yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={speciesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {speciesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SPECIES_PALETTE[index % SPECIES_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', borderColor: '#e3dec9', fontSize: '11px', fontFamily: 'Inter' }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart B: Clinical Bio-Safety Health Matrix */}
        <div className="bg-white border border-[#e3dec9] rounded-3xl p-5 md:p-6 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="font-serif font-black text-sm text-[#5a5a40] flex items-center gap-1.5">
              <span>🩺</span> Health and Biosafety Isolation Matrix
            </h4>
            <p className="text-[10px] text-zinc-650 leading-relaxed mt-0.5">Real-time counts of isolated, treated, or flagged specimen groups.</p>
          </div>

          <div className="h-64 w-full">
            {animals.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                Track individual animals to see diagnostic statuses.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={healthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0efe6" />
                  <XAxis dataKey="status" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', borderColor: '#e3dec9', fontSize: '11px' }}
                    cursor={{ fill: '#faf7f0' }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {healthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={HEALTH_COLORS[entry.status] || '#5a5a40'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart C: Healthcare Tasks & Services Compliance */}
        <div className="bg-white border border-[#e3dec9] rounded-3xl p-5 md:p-6 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="font-serif font-black text-sm text-[#5a5a40] flex items-center gap-1.5">
              <span>🏥</span> Healthcare Tasks Compliance Rate
            </h4>
            <p className="text-[10px] text-zinc-650 leading-relaxed mt-0.5">Status breakdown of immunizations, deworming cycles, and active treatments.</p>
          </div>

          <div className="h-64 w-full">
            {tasks.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                No healthcare tasks logged yet. Schedule booster loops above.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clinicalActionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0efe6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#e3dec9', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <Bar dataKey="Completed" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Pending" fill="#cca564" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart D: Average Weight (Growth Matrix) */}
        <div className="bg-white border border-[#e3dec9] rounded-3xl p-5 md:p-6 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="font-serif font-black text-sm text-[#5a5a40] flex items-center gap-1.5">
              <span>📈</span> Average Weight (Growth Benchmark matrix)
            </h4>
            <p className="text-[10px] text-zinc-650 leading-relaxed mt-0.5">Tracking averages of registered animal species weights in kilograms.</p>
          </div>

          <div className="h-64 w-full">
            {weightData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                Assign weights in your Animal registration lists to visualize.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c7c5a" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#7c7c5a" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0efe6" />
                  <XAxis dataKey="species" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', borderColor: '#e3dec9', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="averageWeight" stroke="#5a5a40" strokeWidth={2} fillOpacity={1} fill="url(#colorWeight)" name="Avg Weight (KG)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Proactive Advisor Notification Check */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-[#5a5a40]">
        <Heart className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1">
          <h5 className="text-xs font-black uppercase tracking-wider">Dynamic Herds Health Advisor</h5>
          <p className="text-[10px] leading-relaxed text-[#3c3c2b] font-medium">
            Based on active analytics: Vaccine coverage stands at <strong className="font-extrabold text-[#7c7c5a]">{vaccineCoverageRate}%</strong>. Keeping deworming schedules regular prevent parasitic micro-infections. If Sick rate exceeds 5%, prioritize calling a certified Veterinary advisor nearby.
          </p>
        </div>
      </div>

    </div>
  );
}
