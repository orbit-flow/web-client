import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { SUSPENSION_PERIODS } from '../../utils/admin';

// 정지 기간 + 사유(사용자에게 보임). 신고 상세의 정지하기·정지 창에서 같이 쓴다
export function SuspensionFields({ period, reason, onPeriodChange, onReasonChange, reasonError }) {
  return (
    <>
      <Select label="기간" value={period} options={SUSPENSION_PERIODS} onChange={(event) => onPeriodChange(event.target.value)} />
      <Textarea
        label="사유 (사용자에게 보여요)"
        value={reason}
        maxLength={200}
        placeholder="커뮤니티 가이드 위반 (욕설)"
        error={reasonError}
        onChange={(event) => onReasonChange(event.target.value)}
      />
    </>
  );
}
