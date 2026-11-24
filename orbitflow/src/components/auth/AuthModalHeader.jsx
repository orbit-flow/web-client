import { useGoBack } from '../../hooks/useGoBack';
import { IconButton } from '../ui/IconButton';
import backIcon from '../../assets/icons/back.svg';
import closeIcon from '../../assets/icons/close.svg';

// onBack을 넘기면 왼쪽에 뒤로 버튼(회원가입 단계 이동 등). 처리 중 화면처럼 못 닫게 할 땐 showClose={false}
export function AuthModalHeader({ onBack, showClose = true }) {
  // 닫기는 직전 페이지로. 주소로 바로 들어와 앱 안 이전 기록이 없으면 첫 화면으로
  const handleClose = useGoBack('/');

  return (
    <header className="auth-header">
      <div className="auth-header__side">
        {onBack && <IconButton icon={backIcon} label="뒤로" onClick={onBack} />}
      </div>
      <p className="auth-header__title">Orbitflow</p>
      <div className="auth-header__side">
        {showClose && <IconButton icon={closeIcon} label="닫기" onClick={handleClose} />}
      </div>
    </header>
  );
}
