import { normalizeHex } from './color';

// 팀 권한(TeamPermission) — 역할 편집 화면의 스위치 순서
export const TEAM_PERMISSIONS = [
  { value: 'MANAGE_TEAM', label: '팀 관리', description: '팀 정보 · 초대 · 추방 · 역할' },
  { value: 'CREATE_CATEGORIES', label: '카테고리 만들기', description: '팀 카테고리 생성 · 모든 카테고리 관리' },
  { value: 'EDIT_TODOS', label: '할 일 만들기 · 수정', description: '볼 수 있는 카테고리에서' },
  { value: 'ASSIGN_TODOS', label: '할 일 맡기기', description: '다른 구성원에게 배정' },
  { value: 'DELETE_TODOS', label: '할 일 삭제', description: '다른 사람 것 포함' },
];

// 팀 카테고리 공개 범위. 아이콘 이름은 TaskItem·카테고리 표가 같이 쓴다
// 팀 카테고리 공개 범위. 할 일과 그 할 일에 쓴 게시글이 같은 범위를 따른다(게시글은 개인 프로필·타임라인에는 올라가지 않음)
export const TEAM_VISIBILITY = {
  PUBLIC: { label: '전체 공개', short: '공개', description: '팀원이 아니어도 할 일과 게시글을 볼 수 있어요(검색 등)' },
  FOLLOWER: { label: '팀 공개', short: '구성원', description: '팀원만 봐요. 팀 밖에는 보이지 않아요' },
  PRIVATE: { label: '역할 지정', short: '비공개', description: '열람을 받은 역할의 팀원만 봐요' },
};

// TaskItem의 visibility 키(TEAM·ROLE)로 바꾼다
export const teamVisibilityKey = (visibility) => ({ FOLLOWER: 'TEAM', PRIVATE: 'ROLE' })[visibility] ?? visibility;

export const hasPermission = (membership, permission) => Boolean(membership?.permissions?.includes(permission));

// 역할 색: "none"이거나 잘못된 값이면 회색
export const roleColor = (color) => normalizeHex(color) ?? 'var(--neutral-400)';

// 팀 아이콘이 없을 때 쓰는 첫 글자
export const teamInitial = (name) => Array.from(name?.trim() ?? '')[0] ?? '팀';

// icon이 이미지 주소인지(그 밖의 값은 첫 글자로 그린다). blob:은 올리기 전 고른 파일 미리보기
export const isImageIcon = (icon) => typeof icon === 'string' && /^((https?:)?\/\/|blob:)/.test(icon);

// 팀 만들기·설정 폼. icon은 보여 줄 주소(저장된 아이콘 또는 고른 파일의 미리보기), iconFile은 새로 고른 파일
export const EMPTY_TEAM_FORM = { name: '', icon: '', iconFile: null, description: '', isPrivate: false };

export const teamFormOf = (team) => ({
  name: team.name,
  icon: team.icon ?? '',
  iconFile: null,
  description: team.description ?? '',
  isPrivate: team.isPrivate,
});

// 서버로 보낼 값(빈 문자열은 빼서 지운다). 이름이 2자 미만이면 오류 문구. 아이콘은 따로(syncTeamIcon)
export function teamBodyOf(form) {
  const name = form.name.trim();
  if (name.length < 2) return { error: '팀 이름은 2자 이상이에요' };
  return {
    body: {
      name,
      description: form.description.trim() || undefined,
      isPrivate: form.isPrivate,
    },
  };
}
