import { useState } from 'react';
import { getErrorMessage } from '../../api/axios';
import { confirmPayment } from '../../api/payment';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { IconButton } from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import { Radio } from '../ui/Radio';
import { formatPoint, formatWon } from '../../utils/avatar';
import { showErrorToast } from '../../utils/errorToast';
import closeIcon from '../../assets/icons/close.svg';

const METHODS = ['신용 · 체크카드', '계좌이체', '간편결제'];

// 결제하기(폭 440). 테스트 PG라 결제 수단은 화면에만 남고 서버로 가지 않는다
// order: 주문 생성 응답(orderId·amount·point). 승인되면 onPaid(PaymentResponse, method)
export function PaymentModal({ order, onClose, onPaid }) {
  const [method, setMethod] = useState(METHODS[0]);
  const [agreed, setAgreed] = useState(true);
  const [paying, setPaying] = useState(false);

  const pay = async () => {
    setPaying(true);
    try {
      onPaid(await confirmPayment(order), method);
    } catch (err) {
      showErrorToast(getErrorMessage(err, '결제하지 못했어요. 잠시 후 다시 시도해 주세요.'));
      setPaying(false);
    }
  };

  return (
    <Modal busy={paying} label="결제하기" className="modal--form payment-modal" onClose={onClose}>
      <div className="modal__header">
        <div className="modal__title-group">
          <h2 className="modal__title">결제하기</h2>
        </div>
        <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
      </div>
      <dl className="summary-box">
        <div className="summary-box__row">
          <dt>상품</dt>
          <dd>포인트 {formatPoint(order.point)}</dd>
        </div>
        <div className="summary-box__row">
          <dt>주문번호</dt>
          <dd className="summary-box__small">{order.orderId}</dd>
        </div>
        <div className="summary-box__row summary-box__row--total">
          <dt>결제 금액</dt>
          <dd>{formatWon(order.amount)}</dd>
        </div>
      </dl>
      <fieldset className="team-fields__visibility">
        <legend>결제 수단</legend>
        {METHODS.map((item) => (
          <Radio key={item} name="payment-method" label={item} checked={method === item} onChange={() => setMethod(item)} />
        ))}
      </fieldset>
      <Checkbox label="결제 내용을 확인했고 이용약관에 동의해요" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
      <p className="field__hint">충전한 포인트는 사용하지 않았다면 7일 안에 결제 내역에서 환불할 수 있어요</p>
      <div className="modal__actions">
        <Button variant="neutral" onClick={onClose}>
          취소
        </Button>
        <Button disabled={paying || !agreed} onClick={pay}>
          {formatWon(order.amount)} 결제하기
        </Button>
      </div>
    </Modal>
  );
}
