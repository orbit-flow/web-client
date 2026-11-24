import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { formatPoint, formatWon } from '../../utils/avatar';
import checkIcon from '../../assets/icons/check.svg';
import storeIcon from '../../assets/icons/store.svg';

// 충전 완료(폭 400): +포인트, 잔액 변화, 결제 금액·수단, 주문번호
export function PaymentDoneModal({ payment, method, balanceBefore, onClose }) {
  const navigate = useNavigate();
  const balanceAfter = payment.balanceAfter ?? balanceBefore + payment.point;

  return (
    <Modal label="충전 완료" className="modal--form payment-done-modal" onClose={onClose}>
      <span className="payment-done-modal__icon" aria-hidden="true">
        <Icon src={checkIcon} size={32} />
      </span>
      <div className="payment-done-modal__title">
        <h2 className="modal__title">충전이 완료됐어요</h2>
        <p className="payment-done-modal__amount num">+{formatPoint(payment.point)}</p>
      </div>
      <dl className="summary-box">
        <div className="summary-box__row">
          <dt>보유 포인트</dt>
          <dd className="num">
            {formatPoint(balanceBefore)} → {formatPoint(balanceAfter)}
          </dd>
        </div>
        <div className="summary-box__row">
          <dt>결제 금액</dt>
          <dd>
            {formatWon(payment.amount)} · {method.replace(' · 체크', '')}
          </dd>
        </div>
        <div className="summary-box__row">
          <dt>주문번호</dt>
          <dd className="summary-box__small">{payment.orderId}</dd>
        </div>
      </dl>
      <div className="modal__actions">
        <Button variant="neutral" onClick={onClose}>
          닫기
        </Button>
        <Button iconLeft={storeIcon} onClick={() => navigate('/shop')}>
          상점 가기
        </Button>
      </div>
    </Modal>
  );
}
