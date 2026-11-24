import { Button } from '../../components/ui/Button';

// Grafana 대시보드(uid orbitflow)를 nginx의 /grafana/ 경로로 같은 도메인에서 띄운다
// kiosk: Grafana 메뉴·상단바 없이 패널만. 처음 한 번은 iframe 안에 Grafana 로그인 화면이 나온다
const DASHBOARD_URL = '/grafana/d/orbitflow/orbitflow';
const EMBED_URL = `${DASHBOARD_URL}?kiosk&theme=light&refresh=30s`;

// 관리자 · 모니터링: Prometheus가 모은 서버 지표(요청 · 오류 · 응답 시간 · JVM · DB 커넥션)를 Grafana로 본다
export function AdminMonitoringPage() {
  return (
    <div className="page admin-page admin-monitoring">
      <header className="page__header page__header--row">
        <div>
          <h1 className="page__title">모니터링</h1>
          <p className="page__subtitle">요청 · 오류 · 응답 시간과 서버 자원을 30초마다 새로 보여 줘요</p>
        </div>
        <Button variant="secondary" onClick={() => window.open(DASHBOARD_URL, '_blank', 'noopener')}>
          Grafana 새 창으로 열기
        </Button>
      </header>

      <iframe className="admin-monitoring__frame" title="서비스 모니터링 대시보드" src={EMBED_URL} />
      <p className="field__hint">
        처음 열면 Grafana 로그인 화면이 나와요
      </p>
    </div>
  );
}
