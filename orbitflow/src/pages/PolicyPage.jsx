import { AuthModal } from '../components/auth/AuthModal';
import { AuthModalHeader } from '../components/auth/AuthModalHeader';
import { AuthTitle } from '../components/auth/AuthTitle';
import { Button } from '../components/ui/Button';
import { useGoBack } from '../hooks/useGoBack';

// 이용약관 · 개인정보처리방침 · 문의: 로그인 없이 여는 안내 화면(가입 약관 "보기", 랜딩 바닥글, 정지 화면 "문의하기")
// 본문이 정해질 때까지는 준비 중 안내만 보여 준다. 문구가 생기면 PAGES의 description 자리에 채운다
const PAGES = {
  terms: {
    title: '이용약관',
    description: '이용약관을 준비하고 있어요.\n정식으로 게시되면 이 화면에서 볼 수 있어요.',
  },
  privacy: {
    title: '개인정보처리방침',
    description: '개인정보처리방침을 준비하고 있어요.\n정식으로 게시되면 이 화면에서 볼 수 있어요.',
  },
  support: {
    title: '문의하기',
    description: '문의 창구를 준비하고 있어요.\n열리면 이 화면에서 안내해 드릴게요.',
  },
};

export function PolicyPage({ type }) {
  const { title, description } = PAGES[type];
  // 직전 페이지로. 새 탭(가입 약관 "보기")이나 주소로 바로 들어와 앱 안 이전 기록이 없으면 첫 화면으로
  const goBack = useGoBack('/');

  return (
    <AuthModal>
      <AuthModalHeader />
      <AuthTitle title={title} description={description} />
      <Button size="lg" fullWidth onClick={goBack}>
        돌아가기
      </Button>
    </AuthModal>
  );
}
