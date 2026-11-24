import { useState } from 'react';
import { getErrorMessage } from '../../api/axios';
import { toggleBlock } from '../../api/follow';
import { createReport } from '../../api/report';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { IconButton } from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import { Radio } from '../ui/Radio';
import { Textarea } from '../ui/Textarea';
import { showErrorToast } from '../../utils/errorToast';
import closeIcon from '../../assets/icons/close.svg';
import flagIcon from '../../assets/icons/flag.svg';

const REASONS = ['스팸 · 광고', '욕설 · 비하 · 혐오', '음란물 · 선정적인 내용', '개인정보 노출', '기타'];
// 서버 reason은 최대 255자라 "사유 - 자세한 내용"이 넘지 않게 자세한 내용을 줄인다
const DETAIL_MAX = 200;

// 게시글·댓글·사용자 신고. target: { contentType, targetId?, targetUserUuid?, description, blockUuid? }
// blockUuid가 있으면 "이 사용자도 차단하기"를 함께 보여 준다
export function ReportModal({ target, onClose, onBlocked }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState('');
  const [block, setBlock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (reason === '기타' && !detail.trim()) {
      showErrorToast('기타를 골랐다면 자세한 내용을 적어 주세요');
      return;
    }
    setSubmitting(true);
    try {
      await createReport({
        contentType: target.contentType,
        targetId: target.targetId,
        targetUserUuid: target.targetUserUuid,
        reason: detail.trim() ? `${reason} - ${detail.trim()}` : reason,
      });
      if (block && target.blockUuid) {
        await toggleBlock(target.blockUuid);
        onBlocked?.();
      }
      setDone(true);
    } catch (err) {
      showErrorToast(getErrorMessage(err, '신고하지 못했어요. 잠시 후 다시 시도해 주세요.'));
      setSubmitting(false);
    }
  };

  return (
    <Modal busy={submitting} label="신고하기" className="modal--form report-modal" onClose={onClose}>
      <div className="modal__header">
        <div className="modal__title-group">
          <h2 className="modal__title">신고하기</h2>
          <p className="modal__subtitle">{done ? '신고가 접수됐어요' : target.description}</p>
        </div>
        <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
      </div>

      {done ? (
        <>
          <p className="modal__notice">관리자가 내용을 확인한 뒤 처리해요.</p>
          <div className="modal__actions">
            <Button onClick={onClose}>확인</Button>
          </div>
        </>
      ) : (
        <form className="modal__form" onSubmit={handleSubmit}>
          <fieldset className="report-modal__reasons">
            <legend>신고 사유</legend>
            {REASONS.map((item) => (
              <Radio
                key={item}
                name="report-reason"
                label={item}
                description={item === '기타' ? '아래에 자세히 적어 주세요' : undefined}
                checked={reason === item}
                onChange={() => setReason(item)}
              />
            ))}
          </fieldset>
          <Textarea
            label="자세한 내용 (선택)"
            value={detail}
            maxLength={DETAIL_MAX}
            onChange={(event) => setDetail(event.target.value)}
          />
          {target.blockUuid && (
            <Checkbox
              label="이 사용자도 차단하기"
              description="차단하면 서로의 글과 메시지가 보이지 않아요"
              checked={block}
              onChange={(event) => setBlock(event.target.checked)}
            />
          )}
          <p className="modal__notice">
            신고 내용은 관리자만 볼 수 있어요. 허위 신고는 제재될 수 있어요.
          </p>
          <div className="modal__actions">
            <Button type="submit" variant="danger" iconLeft={flagIcon} disabled={submitting}>
              신고하기
            </Button>
            <Button variant="neutral" onClick={onClose}>
              취소
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
