import { Button } from '../ui/Button';
import checkIcon from '../../assets/icons/check.svg';

// 팔로우 상태 버튼. state: 나 → 상대, followerState: 상대 → 나
// ACCEPTED "✓ 팔로잉"(외곽선) · PENDING "요청됨" · NOT_FOLLOW "팔로우"(상대가 나를 팔로우하면 "맞팔로우")
export function FollowButton({ state, followerState, onClick, disabled }) {
  if (state === 'ACCEPTED') {
    return (
      <Button variant="secondary" dense iconLeft={checkIcon} onClick={onClick} disabled={disabled}>
        팔로잉
      </Button>
    );
  }
  if (state === 'PENDING') {
    return (
      <Button variant="neutral" dense onClick={onClick} disabled={disabled}>
        요청됨
      </Button>
    );
  }
  return (
    <Button dense onClick={onClick} disabled={disabled}>
      {followerState === 'ACCEPTED' ? '맞팔로우' : '팔로우'}
    </Button>
  );
}
