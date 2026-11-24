import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/axios';
import { deleteProfileImage, getMe, updateMe, uploadProfileImage } from '../api/user';
import { AuthModal } from '../components/auth/AuthModal';
import { AuthModalHeader } from '../components/auth/AuthModalHeader';
import { AuthTitle } from '../components/auth/AuthTitle';
import { ProfilePhotoPicker } from '../components/auth/ProfilePhotoPicker';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { showErrorToast } from '../utils/errorToast';
import { validateNickname } from '../utils/validation';

const INTRODUCE_MAX = 100;

// 이메일 가입 직후 프로필(사진·이름·소개)을 채우는 화면(/onboarding). 로그인 상태여야 한다
export function ProfileSetupPage() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [nickname, setNickname] = useState('');
  const [introduce, setIntroduce] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [photoError, setPhotoError] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    getMe()
      .then((user) => {
        if (ignore) return;
        setMe(user);
        setNickname(user.nickname);
        setIntroduce(user.introduce ?? '');
        setProfileImage(user.profileImage ?? null);
      })
      .catch((err) => {
        if (!ignore) showErrorToast(getErrorMessage(err, '내 정보를 불러오지 못했어요.'));
      });
    return () => {
      ignore = true;
    };
  }, []);

  const goHome = () => navigate('/home', { replace: true });

  // 사진은 고르거나 지우는 즉시 서버에 반영한다
  const runPhotoTask = async (task, fallback) => {
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const user = await task();
      setProfileImage(user.profileImage ?? null);
    } catch (err) {
      setPhotoError(getErrorMessage(err, fallback));
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedNickname = nickname.trim();
    const trimmedIntroduce = introduce.trim();
    const changed = trimmedNickname !== me.nickname || trimmedIntroduce !== (me.introduce ?? '');

    const nextErrors = {};
    const nicknameError = validateNickname(nickname);
    if (nicknameError) nextErrors.nickname = nicknameError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!changed) {
      goHome();
      return;
    }

    setSubmitting(true);
    try {
      await updateMe({
        nickname: trimmedNickname,
        introduce: trimmedIntroduce || null,
        isPrivate: me.isPrivate,
        allowNonFollowChatInvite: me.allowNonFollowChatInvite,
      });
      goHome();
    } catch (err) {
      showErrorToast(getErrorMessage(err, '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'));
      setSubmitting(false);
    }
  };

  return (
    <AuthModal busy={submitting}>
      <AuthModalHeader />
      <AuthTitle
        title="프로필을 꾸며 볼까요?"
        description={'다른 사람에게 보이는 모습이에요.\n나중에 설정에서 언제든 바꿀 수 있어요.'}
      />

      <ProfilePhotoPicker
        src={profileImage}
        error={photoError}
        disabled={!me || photoBusy}
        onSelect={(file) => runPhotoTask(() => uploadProfileImage(file), '사진을 올리지 못했어요')}
        onDelete={() => runPhotoTask(deleteProfileImage, '사진을 지우지 못했어요')}
      />

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-fields">
          <Input
            label="이름"
            name="nickname"
            autoComplete="nickname"
            placeholder="이름 입력"
            maxLength={50}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            hint="2~50자"
            error={errors.nickname}
          />
          <Textarea
            label="소개"
            name="introduce"
            placeholder="나를 한 줄로 소개해 주세요"
            maxLength={INTRODUCE_MAX}
            value={introduce}
            onChange={(event) => setIntroduce(event.target.value)}
            error={errors.introduce}
          />
        </div>

        <div className="auth-actions">
          <Button size="lg" type="submit" className="auth-actions__primary" disabled={!me || submitting}>
            시작하기
          </Button>
          <Button size="lg" variant="ghost" onClick={goHome}>
            나중에 할게요
          </Button>
        </div>
      </form>
    </AuthModal>
  );
}
