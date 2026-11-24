import { Link } from 'react-router-dom';
import { Checkbox } from '../ui/Checkbox';

// [필수] 약관 동의 체크 + 보기 링크 (이메일 가입·소셜 가입 공통)
export function TermsAgreement({ checked, onChange }) {
  return (
    <div className="auth-terms">
      <Checkbox
        label="[필수] 이용약관·개인정보 동의"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <Link className="auth-footer__link auth-footer__link--accent" to="/terms" target="_blank">
        보기
      </Link>
    </div>
  );
}
