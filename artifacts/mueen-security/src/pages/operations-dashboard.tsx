import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Activity, ChevronLeft, ChevronRight, FileText, Navigation, Users } from 'lucide-react';
import { Brand, type Language } from './experiences';
import { useSecurityData, type Incident } from '../lib/security-data';
import { initialUnitPositions, locationCoordinates, OperationsMap, type PositionedUnit } from '../components/operations-map';

type Props = { lang: Language; setLang: (language: Language) => void };

export function OperationsDashboard({ lang, setLang }: Props) {
  const { incidents, staff, assignIncident } = useSecurityData();
  const [collapsed, setCollapsed] = useState(false);
  const [crowdTotal, setCrowdTotal] = useState(43860);
  const [density, setDensity] = useState([86, 57, 29]);
  const [simulatedReports, setSimulatedReports] = useState<Incident[]>([]);
  const [units, setUnits] = useState<PositionedUnit[]>(() => initialUnitPositions(staff));
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const openIncidents = incidents.filter((item) => item.status === 'Open');
  const guestReports = openIncidents.filter((item) => item.reportedBy === 'Guest');
  const visibleIncidents = [...incidents.filter((incident) => incident.reportedBy === 'Guest' || incident.status === 'Open'), ...simulatedReports];
  const activityIncidents = [...simulatedReports, ...openIncidents];
  const availableCount = staff.filter((person) => person.status === 'Available').length;

  useEffect(() => {
    setUnits((current) => current.map((unit) => {
      const base = locationCoordinates(unit.person.location);
      return {
        ...unit,
        person: staff.find((person) => person.id === unit.person.id) ?? unit.person,
        position: [base[0] + (Math.random() - 0.5) * 0.00018, base[1] + (Math.random() - 0.5) * 0.00018],
      };
    }));
  }, [staff]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDensity((values) => values.map((value, index) => Math.max(14, Math.min(96, value + Math.round((Math.random() - 0.5) * (index === 0 ? 8 : 12))))));
      setCrowdTotal((value) => value + Math.round((Math.random() - 0.48) * 280));
      setUnits((current) => current.map((unit) => ({
        ...unit,
        position: (() => {
          const base = locationCoordinates(unit.person.location);
          return [base[0] + (Math.random() - 0.5) * 0.00028, base[1] + (Math.random() - 0.5) * 0.00028] as [number, number];
        })(),
      })));
      setLastUpdated(new Date());
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let sequence = 0;
    const timer = window.setInterval(() => {
      const location = ['King Fahd Gate', 'East Plaza', 'Ajyad Gate'][sequence % 3];
      const type: Incident['type'] = sequence % 2 === 0 ? 'Congestion' : 'Medical emergency';
      const report: Incident = {
        id: `SIM-${Date.now()}`,
        type,
        location,
        description: 'Automated demonstration event; no real visitor report was submitted.',
        createdAt: new Date().toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit' }),
        status: 'Open',
        reportedBy: 'Guest',
      };
      sequence += 1;
      setSimulatedReports((current) => [report, ...current].slice(0, 2));
    }, 25000);
    return () => window.clearInterval(timer);
  }, [lang]);

  const dispatchNearest = () => {
    const target = guestReports[0] ?? openIncidents[0];
    if (!target) {
      setFeedback({ text: lang === 'ar' ? 'لا توجد بلاغات مفتوحة للتوجيه حالياً.' : 'There are no open reports to dispatch to.', error: true });
      return;
    }
    const targetPoint = locationCoordinates(target.location);
    const candidates = staff.filter((member) => member.status === 'Available');
    if (!candidates.length) {
      setFeedback({ text: lang === 'ar' ? 'لا يوجد أفراد متاحون للتوجيه.' : 'No available personnel are currently listed.', error: true });
      return;
    }
    const currentPoint = (person: typeof candidates[number]) => units.find((unit) => unit.person.id === person.id)?.position ?? locationCoordinates(person.location);
    const nearest = candidates.reduce((best, person) => {
      const bestPoint = currentPoint(best);
      const point = currentPoint(person);
      return Math.hypot(point[0] - targetPoint[0], point[1] - targetPoint[1]) < Math.hypot(bestPoint[0] - targetPoint[0], bestPoint[1] - targetPoint[1]) ? person : best;
    });
    const assigned = assignIncident(target.id, nearest.id);
    setFeedback(assigned
      ? { text: lang === 'ar' ? `تم توجيه ${nearest.name} إلى ${target.id} (${target.location}).` : `${nearest.name} assigned to ${target.id} at ${target.location}.`, error: false }
      : { text: lang === 'ar' ? 'تعذر إتمام التوجيه. تحقق من حالة الفرد والبلاغ.' : 'Dispatch could not be completed. Recheck the unit and report status.', error: true });
  };

  const appTime = lastUpdated.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return <div className="command-center" dir={lang === 'ar' ? 'rtl' : 'ltr'} data-testid="page-dashboard">
    <header className="command-topbar">
      <Brand compact />
      <div className="monitor-live" data-testid="status-live-monitoring"><i className="live-light" />{lang === 'ar' ? 'مراقبة توضيحية' : 'LIVE MONITORING'}</div>
      <span className="command-tag" data-testid="label-simulated-demo">{lang === 'ar' ? 'عرض توضيحي · بيانات محاكاة' : 'SIMULATED DEMO · ILLUSTRATIVE DATA'}</span>
      <nav className="command-nav" aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}>
        <Link href="/dashboard" className="active" data-testid="link-dashboard"><Activity />{lang === 'ar' ? 'العمليات' : 'Operations'}</Link>
        <Link href="/staff" data-testid="link-staff"><Users />{lang === 'ar' ? 'الأفراد' : 'Staff'}</Link>
        <Link href="/report" data-testid="link-guest-report"><FileText />{lang === 'ar' ? 'بلاغ زائر' : 'Guest report'}</Link>
      </nav>
      <button className="command-lang" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} data-testid="button-language" aria-label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}>{lang === 'en' ? 'العربية' : 'English'}</button>
    </header>
    <main className="command-main">
      <OperationsMap incidents={visibleIncidents} units={units} lang={lang} density={density} />
      <div className="map-hud">
        <div className="map-title"><div className="eyebrow">{lang === 'ar' ? 'مركز تنسيق السلامة · مكة المكرمة' : 'HARAM SAFETY COORDINATION · MAKKAH'}</div><h1>{lang === 'ar' ? 'مركز العمليات' : 'Operations center'}</h1><p>{lang === 'ar' ? 'حرم المسجد الحرام · عرض مكاني توضيحي' : 'Al-Masjid al-Haram · illustrative spatial view'}</p></div>
        <div className="map-coordinates" data-testid="text-map-center">21.4225° N&nbsp; 39.8262° E</div>
      </div>
      <aside className={`ops-panel ${collapsed ? 'collapsed' : ''}`} aria-label={lang === 'ar' ? 'لوحة القياس والتوجيه' : 'Telemetry and dispatch panel'} data-testid="panel-telemetry">
        <div className="ops-panel-head">
          {!collapsed && <div><div className="ops-panel-title">{lang === 'ar' ? 'لوحة المتابعة' : 'FIELD OVERVIEW'}</div><span className="ops-panel-kicker">{lang === 'ar' ? 'مؤشرات توضيحية · محلية' : 'SIMULATED TELEMETRY · LOCAL DEMO'}</span></div>}
          <button className="icon-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? (lang === 'ar' ? 'توسيع لوحة المتابعة' : 'Expand telemetry panel') : (lang === 'ar' ? 'طي لوحة المتابعة' : 'Collapse telemetry panel')} data-testid="button-toggle-telemetry">{collapsed ? (lang === 'ar' ? <ChevronLeft /> : <ChevronRight />) : (lang === 'ar' ? <ChevronRight /> : <ChevronLeft />)}</button>
        </div>
        {!collapsed && <div className="panel-content">
          <div className="telemetry-grid">
            <div className="telemetry-card crowd" data-testid="metric-predicted-crowd"><div className="telemetry-label">{lang === 'ar' ? 'إجمالي الحشود المتوقع' : 'Predicted crowd total'}</div><div className="telemetry-number">{crowdTotal.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}<small>{lang === 'ar' ? 'زائر' : 'visitors'}</small></div></div>
            <div className="telemetry-card visitor" data-testid="metric-active-reports"><div className="telemetry-label">{lang === 'ar' ? 'بلاغات الزوار النشطة' : 'Active visitor reports'}</div><div className="telemetry-number">{guestReports.length}<small>{lang === 'ar' ? 'مفتوح' : 'open'}</small></div></div>
          </div>
          <div className="telemetry-section">
            <div className="telemetry-section-title">{lang === 'ar' ? 'وحدات الاستجابة' : 'Response units'}<span>{availableCount} {lang === 'ar' ? 'متاح' : 'available'} · {staff.length} {lang === 'ar' ? 'إجمالي' : 'total'}</span></div>
            {units.slice(0, 4).map(({ person }) => <div className="unit-row" key={person.id} data-testid={`unit-row-${person.id}`}><i className={`unit-indicator ${person.status === 'Assigned' ? 'assigned' : ''}`} /><div className="unit-copy"><strong>{person.name}</strong><small>{person.role} · {person.location}</small></div><span className="unit-status">{person.status === 'Available' ? (lang === 'ar' ? 'متاح' : 'READY') : person.status === 'Assigned' ? (lang === 'ar' ? 'مكلّف' : 'ASSIGNED') : (lang === 'ar' ? 'غير متاح' : 'OFFLINE')}</span></div>)}
          </div>
          <button className="dispatch-action" onClick={dispatchNearest} disabled={!openIncidents.length || !availableCount} data-testid="button-dispatch-nearest"><Navigation />{lang === 'ar' ? 'توجيه أقرب فرد متاح' : 'Dispatch Nearest Security Unit'}</button>
          {feedback && <div className={`dispatch-feedback ${feedback.error ? 'error' : ''}`} role="status" data-testid="status-dispatch-feedback">{feedback.text}</div>}
          <div className="telemetry-section">
            <div className="telemetry-section-title">{lang === 'ar' ? 'النشاط المفتوح' : 'Open report activity'}<span>{lang === 'ar' ? 'مزامنة محلية' : 'LOCAL DEMO LOG'}</span></div>
            <div className="activity-list">
              {activityIncidents.slice(0, 5).map((incident) => <div className="map-activity" key={incident.id} data-testid={`activity-${incident.id}`}><i /><span>{incident.id.startsWith('SIM-') ? (lang === 'ar' ? 'تنبيه محاكاة' : 'Simulated alert') : incident.reportedBy === 'Guest' ? (lang === 'ar' ? 'بلاغ زائر' : 'Guest report') : (lang === 'ar' ? 'بلاغ مسجل' : 'Logged incident')} · {incident.location}<small>{incident.id} · {incident.type}{incident.description ? ` — ${incident.description}` : ''}</small></span><time>{incident.createdAt}</time></div>)}
              {!openIncidents.length && <div className="empty-state" data-testid="empty-open-reports">{lang === 'ar' ? 'لا توجد بلاغات مفتوحة.' : 'No open reports right now.'}</div>}
            </div>
          </div>
          <div className="telemetry-section">
            <div className="telemetry-section-title">{lang === 'ar' ? 'آخر تحديث' : 'Last update'}<span data-testid="text-last-update">{appTime}</span></div>
            <div className="panel-caption">{lang === 'ar' ? 'تتغير تقديرات الكثافة ومواقع الوحدات محلياً كل بضع ثوانٍ. لا توجد بيانات مباشرة.' : 'Illustrative density estimates and unit pins shift locally every few seconds. No live feeds are connected.'}</div>
          </div>
        </div>}
      </aside>
      <div className="map-legend-box" aria-label={lang === 'ar' ? 'مفتاح الخريطة' : 'Map legend'}><span className="legend-heading">{lang === 'ar' ? 'المفتاح' : 'Legend'}</span><div className="ops-legend"><span><i className="legend-swatch high" />{lang === 'ar' ? 'مرتفع' : 'High'}</span><span><i className="legend-swatch medium" />{lang === 'ar' ? 'متوسط' : 'Medium'}</span><span><i className="legend-swatch low" />{lang === 'ar' ? 'منخفض' : 'Low'}</span><span><i className="legend-swatch unit" />{lang === 'ar' ? 'وحدة' : 'Unit'}</span><span><i className="legend-swatch alert" />{lang === 'ar' ? 'بلاغ' : 'Report'}</span></div></div>
      <div className="map-footer-note">{lang === 'ar' ? 'خريطة OpenStreetMap · جميع المؤشرات والمواقع محاكاة تعليمية' : 'OpenStreetMap base map · all metrics and unit positions are educational simulations'}</div>
    </main>
  </div>;
}
