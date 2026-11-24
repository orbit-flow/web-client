import { useState } from 'react';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Radio } from '../ui/Radio';

// 반복 회차를 고칠 때 바꿀 범위(PUT /api/routines/{id}?scope=)
export function RepeatScopeDialog({ name, summary, saving, onConfirm, onClose }) {
  const [scope, setScope] = useState('ALL');

  return (
    <Dialog
      busy={saving}
      title="반복 일정 수정"
      description={`"${name}"는 ${summary} 반복돼요. 어느 회차까지 바꿀까요?`}
      onClose={onClose}
      actions={
        <>
          <Button variant="neutral" onClick={onClose}>
            취소
          </Button>
          <Button onClick={() => onConfirm(scope)} disabled={saving}>
            저장
          </Button>
        </>
      }
    >
      <div className="dialog__options" role="radiogroup" aria-label="수정 범위">
        <Radio
          name="routine-scope"
          label="모든 회차"
          description="지난 회차까지 모두 바뀌어요"
          checked={scope === 'ALL'}
          onChange={() => setScope('ALL')}
        />
        <Radio
          name="routine-scope"
          label="완료하지 않은 회차만"
          description="이미 완료한 기록은 그대로 남아요"
          checked={scope === 'INCOMPLETE'}
          onChange={() => setScope('INCOMPLETE')}
        />
      </div>
    </Dialog>
  );
}
