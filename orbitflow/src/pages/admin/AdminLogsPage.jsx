import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Tag } from '../../components/ui/Tag';
import searchIcon from '../../assets/icons/search.svg';

// Grafana "OrbitFlow 로그" 대시보드(uid orbitflow-logs, Loki). 필터는 이 화면에서 고르고 주소의 var-*로 넘긴다
// (kiosk 모드에서는 Grafana 쪽 필터가 안 보이므로 대시보드 변수는 숨겨 두었다)
const DASHBOARD_URL = '/grafana/d/orbitflow-logs/orbitflow-logs';

const LEVELS = [
  { value: '.*', label: '전체' },
  { value: 'ERROR', label: '에러' },
  { value: 'WARN', label: '경고' },
  { value: 'INFO', label: '정보' },
];

const SERVICE_OPTIONS = [
  { value: '.+', label: '서비스: 전체' },
  { value: 'app', label: '서비스: 백엔드' },
  { value: 'nginx', label: '서비스: nginx' },
  { value: 'mysql', label: '서비스: MySQL' },
];

const RANGE_OPTIONS = [
  { value: 'now-1h', label: '최근 1시간' },
  { value: 'now-6h', label: '최근 6시간' },
  { value: 'now-24h', label: '최근 24시간' },
  { value: 'now-7d', label: '최근 7일' },
  { value: 'now-15d', label: '최근 15일' },
];

// 검색어는 글자 그대로 찾는다(대소문자 무시는 대시보드의 (?i))
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function dashboardUrl({ service, level, search, from }, embed) {
  const params = new URLSearchParams({
    'var-service': service,
    'var-level': level,
    'var-search': escapeRegex(search.trim()),
    from,
    to: 'now',
    refresh: '30s',
    theme: 'light',
  });
  return `${DASHBOARD_URL}?${params}${embed ? '&kiosk' : ''}`;
}

// 관리자 · 로그: app · nginx · mysql 컨테이너 로그(15일 보관)를 레벨 · 서비스 · 검색어로 찾는다
export function AdminLogsPage() {
  const [filters, setFilters] = useState({ service: '.+', level: '.*', search: '', from: 'now-1h' });
  const [keyword, setKeyword] = useState('');
  const update = (patch) => setFilters((current) => ({ ...current, ...patch }));

  return (
    <div className="page admin-page admin-monitoring">
      <header className="page__header page__header--row">
        <div>
          <h1 className="page__title">로그</h1>
          <p className="page__subtitle">백엔드 · nginx · MySQL 로그를 15일 동안 모아 보여 줘요</p>
        </div>
        <Button variant="secondary" onClick={() => window.open(dashboardUrl(filters, false), '_blank', 'noopener')}>
          Grafana 새 창으로 열기
        </Button>
      </header>

      <form
        className="admin-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          update({ search: keyword });
        }}
      >
        {LEVELS.map((item) => (
          <Tag key={item.value} size="lg" selected={filters.level === item.value} onClick={() => update({ level: item.value })}>
            {item.label}
          </Tag>
        ))}
        <span className="admin-toolbar__grow" />
        <Select aria-label="서비스" value={filters.service} options={SERVICE_OPTIONS} onChange={(event) => update({ service: event.target.value })} className="admin-toolbar__select" />
        <Select aria-label="기간" value={filters.from} options={RANGE_OPTIONS} onChange={(event) => update({ from: event.target.value })} className="admin-toolbar__select" />
        <Input
          aria-label="로그 검색"
          iconLeft={searchIcon}
          placeholder="검색어 입력 후 Enter"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          className="admin-toolbar__search"
        />
      </form>

      <iframe className="admin-monitoring__frame" title="서비스 로그" src={dashboardUrl(filters, true)} />
    </div>
  );
}
