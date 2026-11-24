import { getOAuthLoginUrl, rememberOAuthProvider } from '../../api/auth';
import { SOCIAL_PROVIDERS } from './socialProviders';

// 누르면 GET /oauth2/authorization/{provider}로 이동(페이지 이동이라 링크로 둔다)
// disabled면 흑백으로 보이고 눌리지 않는다(링크 없음)
export function SocialButton({ id, name, logo, disabled = false }) {
  if (disabled) {
    return (
      <span className={`social-button social-button--${id} social-button--disabled`} aria-disabled="true" title={`${name} 로그인은 준비 중이에요`}>
        <img src={logo} alt="" />
        {name}로 계속하기
      </span>
    );
  }
  return (
    <a
      className={`social-button social-button--${id}`}
      href={getOAuthLoginUrl(id)}
      onClick={() => rememberOAuthProvider(id)}
    >
      <img src={logo} alt="" />
      {name}로 계속하기
    </a>
  );
}

export function SocialButtons() {
  return (
    <div className="social-buttons">
      {SOCIAL_PROVIDERS.map((provider) => (
        <SocialButton key={provider.id} {...provider} />
      ))}
    </div>
  );
}
