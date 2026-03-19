'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import BottomNav from '@/components/bottom-nav';

const USER_ID = '00000000-0000-0000-0000-000000000000';

interface SetRow {
  id: string;
  completed_at: string;
  exercise_name: string;
  set_number: number;
  weight: number;
  reps: number;
  notes: string | null;
  workout_number: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const [sets, setSets] = useState<SetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [showTips, setShowTips] = useState(true);

  // Einstellungen aus localStorage laden
  useEffect(() => {
    const desc = localStorage.getItem('showDescriptions');
    const tips = localStorage.getItem('showTips');
    if (desc !== null) setShowDescriptions(desc === 'true');
    if (tips !== null) setShowTips(tips === 'true');
  }, []);

  const toggleSetting = (key: string, value: boolean, setter: (v: boolean) => void) => {
    const newVal = !value;
    setter(newVal);
    localStorage.setItem(key, String(newVal));
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('workout_sets')
        .select(`
          id,
          completed_at,
          set_number,
          weight,
          reps,
          notes,
          workouts!inner(workout_number, user_id),
          plan_exercises!inner(name)
        `)
        .eq('workouts.user_id', USER_ID)
        .order('completed_at', { ascending: false })
        .limit(500);

      if (!error && data) {
        setSets(data.map((row: any) => ({
          id: row.id,
          completed_at: row.completed_at,
          exercise_name: row.plan_exercises?.name ?? '—',
          set_number: row.set_number,
          weight: row.weight,
          reps: row.reps,
          notes: row.notes,
          workout_number: row.workouts?.workout_number ?? 0,
        })));
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const handleExportCSV = () => {
    const header = 'Datum,Uhrzeit,Einheit,Übung,Satz,Gewicht (kg),Reps,Notizen';
    const rows = sets.map(s => {
      const d = new Date(s.completed_at);
      const date = d.toLocaleDateString('de-DE');
      const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      return `${date},${time},${s.workout_number},"${s.exercise_name}",${s.set_number},${s.weight},${s.reps},"${s.notes ?? ''}"`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness-daten-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans max-w-md mx-auto pb-28">
      <header className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black uppercase tracking-tight">Daten</h1>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={sets.length === 0}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
      </header>

      {/* Einstellungen */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Einstellungen</h2>
        <div className="space-y-2">
          <button
            onClick={() => toggleSetting('showDescriptions', showDescriptions, setShowDescriptions)}
            className="w-full glass-card p-4 border-white/5 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-bold text-left">Übungsbeschreibungen</p>
              <p className="text-[10px] text-muted-foreground text-left">Zielmuskeln und Ausführung anzeigen</p>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative ${showDescriptions ? 'bg-primary' : 'bg-white/10'}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${showDescriptions ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>
          <button
            onClick={() => toggleSetting('showTips', showTips, setShowTips)}
            className="w-full glass-card p-4 border-white/5 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-bold text-left">Ausführungstipps</p>
              <p className="text-[10px] text-muted-foreground text-left">Häufige Fehler im Workout anzeigen</p>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative ${showTips ? 'bg-primary' : 'bg-white/10'}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${showTips ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Daten */}
      <div className="px-4 pt-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Trainingsdaten</h2>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
          {sets.length} geloggte Sätze · neueste zuerst
        </p>

        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm py-16">Lade...</div>
        ) : sets.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-16">Noch keine Daten vorhanden.</div>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-white/10">
                  {['Datum', 'Uhrzeit', 'E#', 'Übung', 'Satz', 'kg', 'Reps', 'Notiz'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sets.map((s, i) => {
                  const d = new Date(s.completed_at);
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-muted-foreground">
                        {d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground font-mono">{s.workout_number}</td>
                      <td className="px-3 py-2 font-bold max-w-[120px] truncate">{s.exercise_name}</td>
                      <td className="px-3 py-2 text-center font-mono">{s.set_number}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-primary">{s.weight}</td>
                      <td className="px-3 py-2 text-right font-mono">{s.reps}</td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[80px] truncate">{s.notes ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
