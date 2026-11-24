import classNames from 'classnames';

// 인증 화면 공통 틀: 화면 가운데 350px 카드. 모바일에서는 전체 폭
// busy면 서버에 보내는 동안 카드 위쪽에 진행 막대가 흐른다(ui.css .progress-top)
export function AuthModal({ busy = false, children }) {
  return (
    <main className="auth-page">
      <section className={classNames('auth-modal', { 'progress-top': busy })} aria-busy={busy || undefined}>
        {children}
      </section>
    </main>
  );
}
