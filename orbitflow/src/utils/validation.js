// 서버 비밀번호 규칙(가입·재설정 공통): 8~20자, 대문자·소문자·숫자·특수문자(@$!%*?&) 각 1개 이상, 이 문자들만 허용
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/;

export const PASSWORD_HINT = '8~20자, 영문 대·소문자·숫자·특수문자';

// 오류 문구를 돌려준다. 문제가 없으면 null
export function validateNickname(nickname) {
  const length = nickname.trim().length;
  return length < 2 || length > 50 ? '이름은 2~50자로 입력해 주세요' : null;
}

// → { password?, passwordConfirm? } 형태의 필드별 오류 문구
export function validatePassword(password, passwordConfirm) {
  const errors = {};
  if (!PASSWORD_PATTERN.test(password)) {
    errors.password = '8~20자, 영문 대·소문자·숫자·특수문자(@$!%*?&)를 모두 넣어 주세요';
  }
  if (password !== passwordConfirm) {
    errors.passwordConfirm = '비밀번호가 서로 달라요';
  }
  return errors;
}
