// 아직 만들지 않은 메뉴 화면 자리. 페이지를 만들면 라우트에서 이 컴포넌트를 바꾼다
export function PlaceholderPage({ title }) {
  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">{title}</h1>
      </header>
      <p className="page__empty">준비 중인 화면이에요.</p>
    </div>
  );
}
