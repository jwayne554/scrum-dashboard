import React, { useMemo, useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend } from "recharts";
import { Flame, Bug, Gauge, Activity, AlertTriangle, Calendar, Users, Timer, TrendingUp } from "lucide-react";

// Lightweight Card primitives (Tailwind, no external UI deps)
const Card = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 ${className}`}>{children}</div>
);
const CardHeader = ({ title, subtitle, icon, action }) => (
  <div className="flex items-start justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
    <div className="flex items-center gap-3">
      {icon && <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800">{icon}</div>}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
        {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);
const CardContent = ({ children, className = "" }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

// Simple progress bar
const Progress = ({ value }) => (
  <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
    <div className="h-2 bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

// Utility to generate mock sprint data
function generateBurndown(days = 10, startPoints = 80, scopeAdds = [3, 7]) {
  const data = [];
  let remaining = startPoints;
  for (let d = 0; d <= days; d++) {
    const dateLabel = `Day ${d}`;
    // Ideal straight line
    const ideal = startPoints - (startPoints / days) * d;
    // Scope change events
    if (scopeAdds.includes(d)) remaining += 8; // scope creep
    // Completion pace (slower start, faster end)
    const burn = Math.round(Math.max(0, (Math.sin((d / days) * Math.PI) * 12) - 2));
    remaining = Math.max(0, remaining - burn);
    data.push({ day: dateLabel, remaining, ideal: Math.max(0, ideal), scope: remaining + (d === days ? 0 : 0) });
  }
  return data;
}

function generateBurnup(days = 10, startScope = 80) {
  const data = [];
  let scope = startScope;
  let done = 0;
  for (let d = 0; d <= days; d++) {
    // random small scope change
    if (d === 3 || d === 7) scope += d === 3 ? 8 : 5;
    const inc = Math.round(Math.max(0, (Math.sin((d / days) * Math.PI) * 10)));
    done = Math.min(scope, done + inc);
    data.push({ day: `Day ${d}`, done, scope });
  }
  return data;
}

function generateBugInflow(days = 14) {
  const data = [];
  let mttr = 1.8; // days
  for (let d = 0; d < days; d++) {
    const created = Math.max(0, Math.round(2 + Math.sin(d / 2) * 2));
    const resolved = Math.max(0, Math.round(2 + Math.cos(d / 3) * 1.8));
    mttr = Math.max(0.5, Math.min(5, mttr + (Math.random() - 0.5) * 0.3));
    data.push({ day: `D${d+1}`, created, resolved, mttr: Number(mttr.toFixed(1)) });
  }
  return data;
}

function generateCFD(days = 10) {
  const data = [];
  let todo = 50, inProg = 10, review = 5, done = 0;
  for (let d = 0; d <= days; d++) {
    const flow = Math.max(1, Math.round(Math.sin((d / days) * Math.PI) * 6));
    // move across columns with slight WIP growth mid-sprint
    const toInProg = Math.min(todo, Math.round(flow * 1.2));
    todo -= toInProg; inProg += toInProg;
    const toReview = Math.min(inProg, Math.round(flow));
    inProg -= toReview; review += toReview;
    const toDone = Math.min(review, Math.round(flow * 0.9));
    review -= toDone; done += toDone;
    // occasional scope add
    if (d === 3) todo += 8; if (d === 7) todo += 5;
    data.push({ day: `Day ${d}`, todo, inProg, review, done });
  }
  return data;
}

// Small helper components
const KPI = ({ icon, label, value, sub }) => (
  <Card>
    <CardContent>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500">{label}</p>
          <div className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</div>
          {sub && <div className="mt-1 text-xs text-neutral-500">{sub}</div>}
        </div>
        <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

const Select = ({ label, value, onChange, options }) => (
  <label className="text-sm text-neutral-600 dark:text-neutral-300 flex flex-col gap-1">
    <span className="text-xs">{label}</span>
    <select value={value} onChange={e => onChange(e.target.value)} className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </label>
);

const Badge = ({ children, tone = "neutral" }) => {
  const toneMap = {
    neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    red: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  };
  return <span className={`px-2 py-1 rounded-lg text-xs ${toneMap[tone]}`}>{children}</span>
}

export default function ScrumDashboardMockup() {
  const [team, setTeam] = useState("Team Atlas");
  const [sprint, setSprint] = useState("Sprint 28");
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Mock datasets
  const burndown = useMemo(() => generateBurndown(10, 80, [3,7]), []);
  const burnup = useMemo(() => generateBurnup(10, 80), []);
  const bugs = useMemo(() => generateBugInflow(14), []);
  const cfd = useMemo(() => generateCFD(10), []);

  // Derived mock KPIs
  const completion = 68; // % done
  const committed = 82; // pts
  const completed = 56; // pts
  const velocityAvg = 54; // 3-sprint rolling
  const planningAccuracy = Math.round((completed / committed) * 100);
  const scopeChange = +13; // % vs start
  const unplanned = 22; // % of work
  const mttr = bugs.reduce((a,b)=>a+b.mttr,0)/bugs.length;

  return (
    <div className="min-h-screen w-full bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-7xl mx-auto px-5 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Real-time Scrum Dashboard</h1>
            <p className="text-sm text-neutral-500">Live view of {team} · {sprint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select label="Team" value={team} onChange={setTeam} options={["Team Atlas","Team Helios","Team Nova"]} />
            <Select label="Sprint" value={sprint} onChange={setSprint} options={["Sprint 28","Sprint 29","Sprint 30"]} />
            <button onClick={() => setTheme(t => t === 'light' ? 'dark':'light')} className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700">{theme === 'light' ? 'Dark' : 'Light'} mode</button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardHeader title="Sprint Health" subtitle="Done vs remaining" icon={<Gauge className="w-5 h-5"/>} />
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">{completion}% complete</span>
                <Badge tone={completion >= 70 ? 'green' : 'amber'}>{completion >= 70 ? 'On track' : 'At risk'}</Badge>
              </div>
              <Progress value={completion} />
              <div className="mt-3 text-xs text-neutral-500">Completed {completed} / {committed} pts · Unplanned {unplanned}%</div>
            </CardContent>
          </Card>

          <KPI icon={<Activity className="w-5 h-5"/>} label="Velocity (rolling avg)" value={`${velocityAvg} pts`} sub="last 3 sprints" />

          <KPI icon={<TrendingUp className="w-5 h-5"/>} label="Planning Accuracy" value={`${planningAccuracy}%`} sub="completed / committed" />

          <KPI icon={<AlertTriangle className="w-5 h-5"/>} label="Scope Change" value={`${scopeChange > 0 ? '+' : ''}${scopeChange}%`} sub="vs sprint start" />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          <Card className="lg:col-span-2">
            <CardHeader title="Burndown (with ideal line)" subtitle="Points remaining per day" icon={<Calendar className="w-5 h-5"/>}
              action={<Badge tone="amber">Scope added on Day 3 & 7</Badge>} />
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={burndown} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="remaining" stroke="#10b981" strokeWidth={2} dot={false} name="Remaining" />
                  <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="4 4" dot={false} name="Ideal" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Bug Inflow / Outflow" subtitle="Daily created vs resolved" icon={<Bug className="w-5 h-5"/>}
              action={<Badge tone={mttr <= 2 ? 'green' : 'amber'}>MTTR {mttr.toFixed(1)}d</Badge>} />
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bugs} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="created" name="Created" fill="#ef4444" radius={[6,6,0,0]} />
                  <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <Card className="lg:col-span-2">
            <CardHeader title="Cumulative Flow Diagram" subtitle="Work in each state" icon={<Gauge className="w-5 h-5"/>}
              action={<Badge tone="blue">Watch for band widening</Badge>} />
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cfd} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="todo" stackId="1" stroke="#93c5fd" fill="#93c5fd" name="To Do" />
                  <Area type="monotone" dataKey="inProg" stackId="1" stroke="#60a5fa" fill="#60a5fa" name="In Progress" />
                  <Area type="monotone" dataKey="review" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="In Review" />
                  <Area type="monotone" dataKey="done" stackId="1" stroke="#10b981" fill="#10b981" name="Done" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Work Item Age (today)" subtitle="Oldest WIP first" icon={<Timer className="w-5 h-5"/>} />
            <CardContent>
              <div className="space-y-3 text-sm">
                {[
                  { id: "PAY-412", title: "Payroll export mapping (NetSuite)", days: 6, owner: "L. Chen" },
                  { id: "EOR-287", title: "Legal entity docs upload flow", days: 4, owner: "M. Silva" },
                  { id: "CORE-190", title: "User provisioning via SCIM", days: 3, owner: "A. Patel" },
                  { id: "QA-131", title: "Regression suite flaky tests", days: 2, owner: "QA Pool" },
                ].map(row => (
                  <div key={row.id} className="flex items-center justify-between p-2 rounded-xl border border-neutral-200 dark:border-neutral-700">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{row.id} · {row.title}</p>
                      <p className="text-xs text-neutral-500">Owner: {row.owner}</p>
                    </div>
                    <Badge tone={row.days >= 5 ? 'red' : row.days >=3 ? 'amber' : 'green'}>{row.days}d</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader title="Activity Feed (last 24h)" subtitle="Key events from Linear" icon={<Users className="w-5 h-5"/>} />
            <CardContent>
              <ul className="space-y-2 text-sm">
                {[
                  { t: "10:04", msg: "PAY-412 moved to In Review by L. Chen" },
                  { t: "09:31", msg: "BUG-198 resolved by K. Rao (p1)" },
                  { t: "08:22", msg: "EOR-301 scope increased by 3 pts" },
                  { t: "Yesterday", msg: "Sprint 28 committed: 82 pts" },
                ].map((i, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500 w-16">{i.t}</span>
                    <span className="flex-1">{i.msg}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Top Blockers" subtitle="Open and waiting" icon={<AlertTriangle className="w-5 h-5"/>} />
            <CardContent>
              <div className="space-y-3 text-sm">
                {[
                  { id: "CORE-174", title: "OAuth redirect whitelisting pending", wait: "2d 6h" },
                  { id: "EOR-276", title: "Vendor sandbox credentials", wait: "1d 3h" },
                  { id: "QA-129", title: "Test data for NL payroll edge cases", wait: "19h" },
                ].map(b => (
                  <div key={b.id} className="flex items-center justify-between p-2 rounded-xl border border-neutral-200 dark:border-neutral-700">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{b.id} · {b.title}</p>
                      <p className="text-xs text-neutral-500">Waiting: {b.wait}</p>
                    </div>
                    <Badge tone="red">Blocked</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
