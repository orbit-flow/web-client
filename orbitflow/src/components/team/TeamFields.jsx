import { useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Radio } from '../ui/Radio';
import { Textarea } from '../ui/Textarea';
import { TeamIcon } from './TeamIcon';
import { showErrorToast } from '../../utils/errorToast';
import imageIcon from '../../assets/icons/image.svg';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// 팀 만들기·팀 설정(일반)에서 같이 쓰는 입력: 아이콘 · 이름 · 소개 · 공개 범위
// 아이콘은 이미지 파일을 골라 미리보기만 보여 주고, 실제 업로드는 저장할 때(syncTeamIcon)
export function TeamFields({ form, onChange, error, disabled = false, idPrefix = 'team' }) {
  const fileRef = useRef(null);
  const set = (key) => (event) => onChange({ ...form, [key]: event.target.value });

  // 미리보기 주소(blob:)는 바뀌거나 화면을 떠날 때 풀어 준다
  useEffect(
    () => () => {
      if (form.icon?.startsWith('blob:')) URL.revokeObjectURL(form.icon);
    },
    [form.icon],
  );

  const pickIcon = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      showErrorToast('JPG · PNG · WEBP · GIF 사진만 올릴 수 있어요');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showErrorToast('사진은 10MB까지예요');
      return;
    }
    onChange({ ...form, icon: URL.createObjectURL(file), iconFile: file });
  };

  return (
    <>
      <div className="team-fields__identity">
        <div className="team-fields__icon-column">
          <TeamIcon name={form.name || '팀'} icon={form.icon} size="xl" />
          <Button variant="secondary" size="sm" iconLeft={imageIcon} fullWidth disabled={disabled} onClick={() => fileRef.current?.click()}>
            {form.icon ? '이미지 변경' : '이미지 추가'}
          </Button>
          <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(',')} hidden onChange={pickIcon} />
          {form.icon && (
            <Button variant="ghost" size="sm" fullWidth disabled={disabled} onClick={() => onChange({ ...form, icon: '', iconFile: null })}>
              기본 아이콘
            </Button>
          )}
        </div>
        <Input
          label="팀 이름"
          value={form.name}
          maxLength={30}
          placeholder="졸업 프로젝트 팀"
          hint="2~30자"
          error={error}
          onChange={set('name')}
          disabled={disabled}
          className="team-fields__name"
        />
      </div>
      <Textarea
        label="소개"
        value={form.description}
        maxLength={200}
        placeholder="어떤 팀인지 적어 주세요"
        onChange={set('description')}
        disabled={disabled}
      />
      <fieldset className="team-fields__visibility team-fields__scope" disabled={disabled}>
        <legend>공개 범위</legend>
        <Radio
          name={`${idPrefix}-visibility`}
          label="공개"
          description="팀 찾기에 나오고 누구나 가입을 신청할 수 있어요"
          checked={!form.isPrivate}
          onChange={() => onChange({ ...form, isPrivate: false })}
        />
        <Radio
          name={`${idPrefix}-visibility`}
          label="비공개"
          description="초대받은 사람만 들어올 수 있어요"
          checked={form.isPrivate}
          onChange={() => onChange({ ...form, isPrivate: true })}
        />
      </fieldset>
    </>
  );
}
