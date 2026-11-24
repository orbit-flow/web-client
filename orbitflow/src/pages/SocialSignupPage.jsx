import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearPendingOAuthProvider, getSocialSignupInfo, socialSignup } from '../api/auth';
import { getErrorMessage } from '../api/axios';
import { deleteProfileImage, getMe, updateMe, uploadProfileImage } from '../api/user';
import { AuthModal } from '../components/auth/AuthModal';
import { AuthModalHeader } from '../components/auth/AuthModalHeader';
import { ProfilePhotoPicker } from '../components/auth/ProfilePhotoPicker';
import { findSocialProvider } from '../components/auth/socialProviders';
import { TermsAgreement } from '../components/auth/TermsAgreement';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { showErrorToast } from '../utils/errorToast';
import { validateNickname } from '../utils/validation';

const INTRODUCE_MAX = 100;

// 처음 보는 소셜 계정: 서버가 /onboarding?ticket=... 으로 보낸다(티켓 30분 유효)
// 가입 API는 이름·약관 동의만 받으므로 사진·소개는 가입(=로그인) 뒤에 따로 저장한다
export function SocialSignupPage({ ticket }) {
  const navigate = useNavigate();

  const [info, setInfo] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [nickname, setNickname] = useState('');
  const [introduce, setIntroduce] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  // 고른 사진은 가입 전이라 바로 올릴 수 없어 미리보기만 하고, 제공자 사진을 지웠는지도 기억한다
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [providerPhotoRemoved, setProviderPhotoRemoved] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    clearPendingOAuthProvider();
    getSocialSignupInfo(ticket)
      .then((signupInfo) => {
        if (ignore) return;
        setInfo(signupInfo);
        setNickname(signupInfo.nickname);
      })
      .catch((err) => {
        if (ignore) return;
        setLoadFailed(true);
        showErrorToast(getErrorMessage(err, '가입 정보를 불러오지 못했어요. 소셜 로그인을 다시 해 주세요.'));
      });
    return () => {
      ignore = true;
    };
  }, [ticket]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const provider = findSocialProvider(info?.provider);
  const providerName = provider?.name ?? '소셜';
  const providerPhoto = providerPhotoRemoved ? null : (info?.profileImage ?? null);

  const handlePhotoSelect = (file) => {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoDelete = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setProviderPhotoRemoved(true);
  };

  // 가입 뒤 사진·소개 저장. 실패해도 계정은 이미 만들어졌으니 프로필 화면에서 다시 하게 한다
  const saveProfileExtras = async () => {
    if (photoFile) {
      await uploadProfileImage(photoFile);
    } else if (providerPhotoRemoved && info.profileImage) {
      await deleteProfileImage();
    }
    const trimmedIntroduce = introduce.trim();
    if (trimmedIntroduce) {
      // PATCH /api/users/me는 네 필드를 모두 보내야 해서 현재 값을 먼저 읽는다
      const me = await getMe();
      await updateMe({
        nickname: me.nickname,
        introduce: trimmedIntroduce,
        isPrivate: me.isPrivate,
        allowNonFollowChatInvite: me.allowNonFollowChatInvite,
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nicknameError = validateNickname(nickname);
    setErrors(nicknameError ? { nickname: nicknameError } : {});
    if (nicknameError) return;

    setSubmitting(true);
    try {
      await socialSignup({ ticket, nickname: nickname.trim(), termsAgreed });
    } catch (err) {
      showErrorToast(getErrorMessage(err, '가입하지 못했어요. 잠시 후 다시 시도해 주세요.'));
      setSubmitting(false);
      return;
    }

    try {
      await saveProfileExtras();
      navigate('/home', { replace: true });
    } catch {
      navigate('/onboarding', { replace: true });
    }
  };

  return (
    <AuthModal busy={submitting}>
      <AuthModalHeader />
      <div className="auth-title">
        {provider && (
          <span className="provider-chip">
            <img src={provider.logo} alt="" width={16} height={16} />
            {providerName} 계정으로 가입 중
          </span>
        )}
        <h1 className="auth-title__heading">처음 오셨네요, 환영해요</h1>
      </div>

      {loadFailed ? (
        <>
          <p className="page__empty">불러오지 못했어요</p>
          <Button size="lg" fullWidth onClick={() => navigate('/login', { replace: true })}>
            로그인 화면으로
          </Button>
        </>
      ) : (
        <>
          <ProfilePhotoPicker
            src={photoPreview ?? providerPhoto}
            disabled={!info || submitting}
            onSelect={handlePhotoSelect}
            onDelete={handlePhotoDelete}
          />

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-fields">
              <Input
                label="이메일"
                type="email"
                value={info?.email ?? ''}
                disabled
                readOnly
                hint={`${providerName} 계정 이메일이에요`}
              />
              <Input
                label="이름"
                name="nickname"
                autoComplete="nickname"
                placeholder="이름 입력"
                maxLength={50}
                disabled={!info}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                hint={`2~50자 · ${providerName} 이름을 가져왔어요`}
                error={errors.nickname}
              />
              <Textarea
                label="소개"
                name="introduce"
                placeholder="나를 한 줄로 소개해 주세요"
                maxLength={INTRODUCE_MAX}
                disabled={!info}
                value={introduce}
                onChange={(event) => setIntroduce(event.target.value)}
              />
            </div>

            <TermsAgreement checked={termsAgreed} onChange={setTermsAgreed} />

            <Button size="lg" type="submit" fullWidth disabled={!info || !termsAgreed || submitting}>
              가입하고 시작하기
            </Button>
          </form>
        </>
      )}
    </AuthModal>
  );
}
