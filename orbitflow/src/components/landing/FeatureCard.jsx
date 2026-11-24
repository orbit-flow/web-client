import { Icon } from '../ui/Icon';

// 랜딩 기능 소개 카드: 아이콘 상자 48 + 제목 + 설명
export function FeatureCard({ icon, title, children }) {
  return (
    <article className="feature-card">
      <span className="feature-card__icon">
        <Icon src={icon} />
      </span>
      <h3 className="feature-card__title">{title}</h3>
      <p className="feature-card__desc">{children}</p>
    </article>
  );
}
