import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Activity, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, FileText, Navigation, ShieldCheck, Users } from 'lucide-react';
import { Brand, type Language } from './experiences';
import { useSecurityData, type Incident } from '../lib/security-data';
import { initialUnitPositions, locationCoordinates, OperationsMap, type PositionedUnit } from '../components/operations-map';

type Props = { lang: Language; setLang: (language: Language) => void };
type IncidentFilter = 'All' | 'Active' | 'Resolved';

const activeStatus = (incident: Incident) => incident.status === 'Open' || incident.status === 'Assigned';
const deadlineFor = (incident: Incident) => incident.autoResolveAt ?? (incident as Incident & { expiresAt?: number }).expiresAt;

export function OperationsDashboard({ lang, setLang }: Props) {
  const { incidents, staff, assignIncident, resolveIncident, dismissIncident } = useSecurityData();
  const [collapsed, setCollapsed] = useState(false);
  const [crowdTotal, setCrowdTotal] = useState(43860);
  const [density, setDensity] = useState([86, 57, 29]);
  const [filter, setFilter] = useState<IncidentFilter>('Active');
  const [units, setUnits] = useState<PositionedUnit[]>(() => initialUnitPositions(staff));
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [clock, setClock] = useState(() => new Date());
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const activeIncidents = incidents.filter(activeStatus);
  const resolvedIncidents = incidents.filter((incident) => incident.status === 'Resolved');
  const openIncidents = incidents.filter((incident) => incident.status === 'Open');
  const availableCount = staff.filter((person) => person.status === 'Available').length;
  const assignedCount = staff.filter((person) => person.status === 'Assigned').length;
  const onFieldCount = availableCount + assignedCount;
  const visibleIncidents = filter === 'Active'
    ? activeIncidents
    : filter === 'Resolved'
      ? resolvedIncidents
      : incidents;
  const isArabic = lang === 'ar';

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
    const clockTimer = window.setInterval(() => setClock(new Date()), 1000);
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
    return () => {
      window.clearInterval(clockTimer);
      window.clearInterval(timer);
    };
  }, []);

  const dispatchNearest = () => {
    const target = openIncidents[0];
    if (!target) {
      setFeedback({ text: isArabic ? 'لا توجد بلاغات مفتوحة للتوجيه حالياً.' : 'There are no open reports to dispatch to.', error: true });
      return;
    }
    const targetPoint = locationCoordinates(target.location);
    const candidates = staff.filter((member) => member.status === 'Available');
    if (!candidates.length) {
      setFeedback({ text: isArabic ? 'لا يوجد أفراد متاحون للتوجيه.' : 'No available personnel are currently listed.', error: true });
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
      ? { text: isArabic ? `تم توجيه ${nearest.name} إلى ${target.id} (${target.location}).` : `${nearest.name} assigned to ${target.id} at ${target.location}.`, error: false }
      : { text: isArabic ? 'تعذر إتمام التوجيه. تحقق من حالة الفرد والبلاغ.' : 'Dispatch could not be completed. Recheck the unit and report status.', error: true });
  };

  const appTime = clock.toLocaleTimeString(isArabic ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const updateTime = lastUpdated.toLocaleTimeString(isArabic ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const peakDensity = Math.max(...density);
  const risk = peakDensity >= 75
    ? { en: 'Elevated', ar: 'مرتفع', className: 'high' }
    : peakDensity >= 50
      ? { en: 'Watch', ar: 'متابعة', className: 'medium' }
      : { en: 'Steady', ar: 'مستقر', className: 'low' };
  const filterLabels: Record<IncidentFilter, { en: string; ar: string }> = {
    All: { en: 'All', ar: 'الكل' },
    Active: { en: 'Active', ar: 'النشطة' },
    Resolved: { en: 'Resolved', ar: 'المنجزة' },
  };

  return <div className="command-center" dir={isArabic ? 'rtl' : 'ltr'} data-testid="page-dashboard">
    <header className="command-topbar">
      <Brand compact />
      <div className="monitor-live" data-testid="status-live-monitoring"><i className="live-light" />{isArabic ? 'مراقبة توضيحية' : 'OPERATIONS MONITOR'}</div>
      <span className="command-tag" data-testid="label-simulated-demo">{isArabic ? 'عرض توضيحي · بيانات محاكاة' : 'SIMULATED DEMO · ILLUSTRATIVE DATA'}</span>
      <span className="command-clock" data-testid="text-live-clock" aria-label={isArabic ? 'الوقت الحالي' : 'Current time'}>{appTime}</span>
      <nav className="command-nav" aria-label={isArabic ? 'التنقل الرئيسي' : 'Main navigation'}>
        <Link href="/dashboard" className="active" data-testid="link-dashboard"><Activity />{isArabic ? 'العمليات' : 'Operations'}</Link>
        <Link href="/staff" data-testid="link-staff"><Users />{isArabic ? 'الأفراد' : 'Staff'}</Link>
        <Link href="/report" data-testid="link-guest-report"><FileText />{isArabic ? 'بلاغ زائر' : 'Guest report'}</Link>
      </nav>
      <button className="command-lang" onClick={() => setLang(isArabic ? 'en' : 'ar')} data-testid="button-language" aria-label={isArabic ? 'Switch to English' : 'Switch to Arabic'}>{isArabic ? 'English' : 'العربية'}</button>
    </header>
    <main className="command-main">
      <OperationsMap incidents={visibleIncidents} units={units} staff={staff} lang={lang} density={density} assignIncident={assignIncident} resolveIncident={resolveIncident} dismissIncident={dismissIncident} />
      <div className="map-hud">
        <div className="map-title"><div className="eyebrow">{isArabic ? 'مركز تنسيق السلامة · مكة المكرمة' : 'HARAM SAFETY COORDINATION · MAKKAH'}</div><h1>{isArabic ? 'مركز العمليات' : 'Operations center'}</h1><p>{isArabic ? 'حرم المسجد الحرام · عرض مكاني توضيحي' : 'Al-Masjid al-Haram · illustrative spatial view'}</p></div>
        <div className="map-coordinates" data-testid="text-map-center">21.4225° N&nbsp; 39.8262° E</div>
      </div>
      <aside className={`ops-panel ${collapsed ? 'collapsed' : ''}`} aria-label={isArabic ? 'لوحة القياس والتوجيه' : 'Telemetry and dispatch panel'} data-testid="panel-telemetry">
        <div className="ops-panel-head">
          {!collapsed && <div><div className="ops-panel-title">{isArabic ? 'لوحة المتابعة' : 'FIELD OVERVIEW'}</div><span className="ops-panel-kicker">{isArabic ? 'مؤشرات توضيحية · محلية' : 'SIMULATED TELEMETRY · LOCAL DEMO'}</span></div>}
          <button className="icon-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? (isArabic ? 'توسيع لوحة المتابعة' : 'Expand telemetry panel') : (isArabic ? 'طي لوحة المتابعة' : 'Collapse telemetry panel')} data-testid="button-toggle-telemetry">{collapsed ? (isArabic ? <ChevronLeft /> : <ChevronRight />) : (isArabic ? <ChevronRight /> : <ChevronLeft />)}</button>
        </div>
        {!collapsed && <div className="panel-content">
          <div className="telemetry-grid summary-grid">
            <div className="telemetry-card summary-card visitor" data-testid="metric-active-reports"><div className="telemetry-label"><AlertTriangle size={12} /> {isArabic ? 'البلاغات النشطة' : 'Active reports'}</div><div className="telemetry-number">{activeIncidents.length}<small>{isArabic ? 'بلاغ' : 'reports'}</small></div></div>
            <div className="telemetry-card summary-card resolved" data-testid="metric-resolved-reports"><div className="telemetry-label"><CheckCircle2 size={12} /> {isArabic ? 'البلاغات المنجزة' : 'Resolved reports'}</div><div className="telemetry-number">{resolvedIncidents.length}<small>{isArabic ? 'بلاغ' : 'reports'}</small></div></div>
            <div className="telemetry-card summary-card units" data-testid="metric-on-field-units"><div className="telemetry-label"><Users size={12} /> {isArabic ? 'الوحدات الميدانية' : 'On-field units'}</div><div className="telemetry-number">{onFieldCount}<small>{isArabic ? 'متاح + مكلّف' : 'available + assigned'}</small></div></div>
            <div className={`telemetry-card summary-card risk ${risk.className}`} data-testid="metric-risk-status"><div className="telemetry-label"><ShieldCheck size={12} /> {isArabic ? 'مستوى المخاطر الحالي' : 'Current risk status'}</div><div className="telemetry-number risk-value">{isArabic ? risk.ar : risk.en}<small>{peakDensity}%</small></div></div>
          </div>
          <div className="telemetry-card crowd crowd-estimate" data-testid="metric-predicted-crowd"><div className="telemetry-label">{isArabic ? 'إجمالي الحشود المتوقع · تقديري' : 'Predicted crowd estimate'}</div><div className="telemetry-number">{crowdTotal.toLocaleString(isArabic ? 'ar-SA' : 'en-US')}<small>{isArabic ? 'زائر · توضيحي' : 'visitors · illustrative'}</small></div></div>
          <div className="telemetry-section">
            <div className="telemetry-section-title">{isArabic ? 'وحدات الاستجابة' : 'Response units'}<span>{availableCount} {isArabic ? 'متاح' : 'available'} · {assignedCount} {isArabic ? 'مكلّف' : 'assigned'}</span></div>
            {units.slice(0, 4).map(({ person }) => <div className="unit-row" key={person.id} data-testid={`unit-row-${person.id}`}><i className={`unit-indicator ${person.status === 'Assigned' ? 'assigned' : ''} ${person.status === 'Unavailable' ? 'unavailable' : ''}`} /><div className="unit-copy"><strong>{person.name}</strong><small>{person.role} · {person.location}</small></div><span className="unit-status">{person.status === 'Available' ? (isArabic ? 'متاح' : 'READY') : person.status === 'Assigned' ? (isArabic ? 'مكلّف' : 'ASSIGNED') : (isArabic ? 'غير متاح' : 'OFFLINE')}</span></div>)}
          </div>
          <button className="dispatch-action" onClick={dispatchNearest} disabled={!openIncidents.length || !availableCount} data-testid="button-dispatch-nearest"><Navigation />{isArabic ? 'توجيه أقرب فرد متاح' : 'Dispatch Nearest Security Unit'}</button>
          {feedback && <div className={`dispatch-feedback ${feedback.error ? 'error' : ''}`} role={feedback.error ? 'alert' : 'status'} data-testid="status-dispatch-feedback">{feedback.text}</div>}
          <div className="telemetry-section">
            <div className="telemetry-section-title"><span>{isArabic ? 'سجل البلاغات' : 'Incident feed'}</span><span data-testid="text-feed-count">{visibleIncidents.length} {isArabic ? 'بلاغ' : 'records'}</span></div>
            <div className="incident-filters" role="group" aria-label={isArabic ? 'تصفية البلاغات' : 'Filter incidents'} data-testid="filters-incident-feed">
              {(['All', 'Active', 'Resolved'] as IncidentFilter[]).map((option) => <button key={option} type="button" className="incident-filter" aria-pressed={filter === option} onClick={() => setFilter(option)} data-testid={`button-filter-${option.toLowerCase()}`}>{filterLabels[option][lang]}</button>)}
            </div>
            <div className="incident-feed" aria-live="polite" data-testid="list-incident-feed">
              {visibleIncidents.map((incident) => {
                const remaining = deadlineFor(incident);
                const seconds = remaining && activeStatus(incident) ? Math.max(0, Math.ceil((remaining - clock.getTime()) / 1000)) : null;
                return <article className={`feed-incident ${incident.status.toLowerCase()}`} key={incident.id} data-testid={`activity-${incident.id}`}>
                  <div className="feed-topline"><span className="feed-id">{incident.id}</span><span className={`feed-status ${incident.status.toLowerCase()}`} data-testid={`status-incident-${incident.id}`}>{incident.status === 'Resolved' && isArabic ? 'تم الإنجاز' : incident.status === 'Resolved' ? 'Resolved' : incident.status === 'Dismissed' ? (isArabic ? 'ملغي' : 'Dismissed') : incident.status === 'Assigned' ? (isArabic ? 'مكلّف' : 'Assigned') : (isArabic ? 'مفتوح' : 'Open')}</span></div>
                  <div className="feed-location">{incident.type} · {incident.location}</div>
                  {incident.description && <div className="feed-detail">{incident.description}</div>}
                  <div className="feed-meta"><span>{isArabic ? 'وقت البلاغ' : 'Reported'} · {incident.createdAt}</span>{incident.reportedBy === 'Guest' && seconds !== null && <span className={`feed-countdown ${seconds <= 10 ? 'urgent' : ''}`} role="timer" aria-live="off" data-testid={`countdown-${incident.id}`}>{isArabic ? `ينتهي خلال ${seconds}ث` : `Resolves in ${seconds}s`}</span>}{incident.assignedStaff && <span>{isArabic ? 'مكلّف' : 'Assigned'} · {incident.assignedStaff}</span>}</div>
                </article>;
              })}
              {!visibleIncidents.length && <div className="feed-empty" data-testid="empty-incident-feed">{filter === 'Active' ? (isArabic ? 'لا توجد بلاغات نشطة حالياً.' : 'No active reports right now.') : filter === 'Resolved' ? (isArabic ? 'لا توجد بلاغات منجزة بعد.' : 'No resolved reports yet.') : (isArabic ? 'لا توجد بلاغات في السجل.' : 'No reports in the incident log.')}</div>}
            </div>
          </div>
          <div className="telemetry-section">
            <div className="telemetry-section-title">{isArabic ? 'آخر تحديث توضيحي' : 'Last illustrative update'}<span data-testid="text-last-update">{updateTime}</span></div>
            <div className="panel-caption">{isArabic ? 'تقديرات الحشود ومواقع الوحدات محاكاة محلية وليست بيانات تشغيلية مباشرة. البلاغات المرسلة من الزوار مشتركة بين صفحات العرض وتحمل مهلة إنجاز.' : 'Crowd estimates and unit positions are local simulations, not a real operational feed. Guest reports are shared across demo pages and include a resolution deadline.'}</div>
          </div>
        </div>}
      </aside>
      <div className="map-legend-box" aria-label={isArabic ? 'مفتاح الخريطة' : 'Map legend'}><span className="legend-heading">{isArabic ? 'المفتاح' : 'Legend'}</span><div className="ops-legend"><span><i className="legend-swatch high" />{isArabic ? 'مرتفع' : 'High'}</span><span><i className="legend-swatch medium" />{isArabic ? 'متوسط' : 'Medium'}</span><span><i className="legend-swatch low" />{isArabic ? 'منخفض' : 'Low'}</span><span><i className="legend-swatch unit" />{isArabic ? 'وحدة' : 'Unit'}</span><span><i className="legend-swatch alert" />{isArabic ? 'بلاغ' : 'Report'}</span></div></div>
      <div className="map-footer-note">{isArabic ? 'خريطة OpenStreetMap · جميع مؤشرات الحشود ومواقع الوحدات محاكاة تعليمية وليست تغذية تشغيلية مباشرة' : 'OpenStreetMap base map · crowd metrics and unit positions are educational simulations, not a real operational feed'}</div>
    </main>
  </div>;
}
