import { useState } from 'react';
import { getErrorMessage } from '../../api/axios';
import { updateCategory } from '../../api/category';
import { createTeamCategory } from '../../api/team';
import { Button } from '../ui/Button';
import { ColorField, ColorSwatches } from '../ui/ColorField';
import { IconButton } from '../ui/IconButton';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Radio } from '../ui/Radio';
import { normalizeHex } from '../../utils/color';
import { showErrorToast } from '../../utils/errorToast';
import { TEAM_VISIBILITY } from '../../utils/team';
import closeIcon from '../../assets/icons/close.svg';

const SWATCHES = ['3D78F5', 'ED5C8C', '8C5CF5', '21B273', 'F08C00', 'E5484D', '0EA5A4', '8A8F98'];

// 팀 카테고리 만들기·고치기. 비공개 팀은 "전체 공개"를 고를 수 없다. onSaved(CategoryResponse)
export function TeamCategoryModal({ teamUuid, teamPrivate, category, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    category
      ? { name: category.name, color: `#${category.color}`, visibility: category.visibility }
      : { name: '', color: `#${SWATCHES[0]}`, visibility: 'FOLLOWER' },
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const color = normalizeHex(form.color);
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = '이름을 입력해 주세요';
    if (!color) nextErrors.color = '6자리 색 코드로 입력해 주세요(예: #3D78F5)';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const body = { name: form.name.trim(), color: color.slice(1), visibility: form.visibility };
    setSaving(true);
    try {
      onSaved(category ? await updateCategory(category.id, body) : await createTeamCategory(teamUuid, body));
    } catch (err) {
      showErrorToast(getErrorMessage(err, '카테고리를 저장하지 못했어요.'));
      setSaving(false);
    }
  };

  return (
    <Modal busy={saving} label="카테고리" className="modal--form team-category-modal" onClose={onClose}>
      <div className="modal__header">
        <div className="modal__title-group">
          <h2 className="modal__title">{category ? '카테고리 고치기' : '카테고리 만들기'}</h2>
          <p className="modal__subtitle">역할별 열람·편집은 팀 설정 → 역할 · 권한에서 정해요</p>
        </div>
        <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
      </div>
      <form className="modal__form" onSubmit={handleSubmit}>
        <Input
          label="이름"
          value={form.name}
          maxLength={50}
          placeholder="개발"
          error={errors.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          autoFocus
        />
        <ColorField value={form.color} error={errors.color} onChange={(color) => setForm((prev) => ({ ...prev, color }))} />
        <ColorSwatches
          label="추천 색"
          colors={SWATCHES}
          value={form.color}
          onChange={(color) => setForm((prev) => ({ ...prev, color }))}
        />
        <fieldset className="team-fields__visibility">
          <legend>공개 범위</legend>
          {Object.entries(TEAM_VISIBILITY).map(([value, option]) => (
            <Radio
              key={value}
              name="team-category-visibility"
              label={option.label}
              description={value === 'PUBLIC' && teamPrivate ? '비공개 팀은 고를 수 없어요' : option.description}
              checked={form.visibility === value}
              disabled={value === 'PUBLIC' && teamPrivate}
              onChange={() => setForm((prev) => ({ ...prev, visibility: value }))}
            />
          ))}
        </fieldset>
        {form.visibility === 'PUBLIC' && !teamPrivate && (
          <p className="modal__notice">이 카테고리 할 일에 쓴 게시글은 팀원이 아닌 사람도 검색 등에서 볼 수 있어요</p>
        )}
        <div className="modal__actions">
          <Button variant="neutral" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={saving}>
            {category ? '저장' : '만들기'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
