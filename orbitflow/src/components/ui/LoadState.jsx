import { Button } from './Button';

// 화면 데이터를 불러오는 동안 · 불러오지 못했을 때 본문 자리에 보여 주는 안내
// failed면 제목 + "다시 시도"(onRetry), children은 "다시 시도" 앞에 놓을 버튼(예: "팀 목록으로")
export function LoadState({ failed, title, onRetry, children }) {
  if (!failed) return <p className="page__empty">불러오는 중이에요</p>;

  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      <div className="empty-state__actions">
        {children}
        <Button variant="neutral" onClick={onRetry}>
          다시 시도
        </Button>
      </div>
    </div>
  );
}
