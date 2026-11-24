import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import { getErrorMessage } from '../api/axios';
import { openDirectChat } from '../api/chat';
import { ChatPeopleModal } from '../components/chat/ChatPeopleModal';
import { ChatRoomEmpty, ChatRoomItem } from '../components/chat/ChatRoomItem';
import { ChatRoomView } from '../components/chat/ChatRoomView';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { useRealtime } from '../hooks/useRealtime';
import { chatroomTitle } from '../utils/chat';
import { showErrorToast } from '../utils/errorToast';
import plusIcon from '../assets/icons/plus.svg';
import searchIcon from '../assets/icons/search.svg';

const roomMeta = (room) => (room.type === 'DIRECT' ? '1:1' : `그룹 · ${room.memberCount}명`);

// 채팅: 왼쪽 방 목록(찾기) + 가운데 대화. 고른 방은 ?room=
// 개인 공간이라 팀에서 만든 방(teamUuid 있음)은 여기 나오지 않는다 — 팀 채팅은 팀 화면의 채팅방 탭에서
// 모바일(767px 이하)은 목록 또는 방 하나만: 방을 열면 상단바·하단 탭 없이 화면 전체(chat.css)
export function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const { rooms, reloadRooms } = useRealtime();
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState('');
  const [modal, setModal] = useState(null); // 'new' | 'invite'

  useEffect(() => {
    reloadRooms();
  }, [reloadRooms]);

  const personalRooms = useMemo(() => rooms.filter((room) => !room.teamUuid), [rooms]);
  const query = keyword.trim().toLowerCase();
  const visible = useMemo(
    () => personalRooms.filter((room) => chatroomTitle(room).toLowerCase().includes(query)),
    [personalRooms, query],
  );

  const selectedUuid = searchParams.get('room');
  const selected = personalRooms.find((room) => room.uuid === selectedUuid) ?? null;
  const select = (uuid) => setSearchParams(uuid ? { room: uuid } : {});
  // 모바일: 목록에서 연 방은 기록을 하나 되돌려 닫는다(휴대폰 뒤로 가기와 같게). 주소로 바로 연 방은 목록으로 바꿔 끼운다
  const enter = (uuid) => (isMobile ? setSearchParams({ room: uuid }, { state: { fromList: true } }) : select(uuid));
  const closeRoom = () => (location.state?.fromList ? navigate(-1) : setSearchParams({}, { replace: true }));

  // 고른 방이 없으면 맨 위 방을 주소에 고정한다(새 메시지로 순서가 바뀌어도 보던 방이 그대로). 모바일은 목록이 첫 화면이라 고르지 않는다
  // 프로필의 "메시지"로 들어와 1:1 방을 여는 중이면 맨 위 방을 먼저 띄우지 않는다
  const firstUuid = visible[0]?.uuid;
  const directPending = Boolean(location.state?.userUuid);
  useEffect(() => {
    if (!isMobile && !directPending && !selectedUuid && firstUuid) setSearchParams({ room: firstUuid }, { replace: true });
  }, [isMobile, directPending, selectedUuid, firstUuid, setSearchParams]);

  const openRoom = async (room) => {
    setModal(null);
    await reloadRooms();
    enter(room.uuid);
  };

  // 프로필의 "메시지"로 들어오면(state.userUuid) 그 사람과의 1:1 방을 열거나 만들어 바로 연다
  // 주소를 바꿀 때 state를 비워 새로고침·뒤로 가기로 다시 열지 않게 하고, 개발 모드의 effect 두 번 실행에도 한 번만 요청한다
  const directUserUuid = directPending ? location.state.userUuid : null;
  const openedDirectFor = useRef(null);
  useEffect(() => {
    if (!directUserUuid || openedDirectFor.current === location.key) return;
    openedDirectFor.current = location.key;
    openDirectChat(directUserUuid)
      .then(async (room) => {
        await reloadRooms();
        setSearchParams({ room: room.uuid }, { replace: true });
      })
      .catch((err) => {
        showErrorToast(getErrorMessage(err, '대화를 열지 못했어요.'));
        setSearchParams({}, { replace: true });
      });
  }, [directUserUuid, location.key, reloadRooms, setSearchParams]);

  const roomScreen = isMobile && selected;

  return (
    <div className={classNames('page chat-page', { 'chat-page--room': roomScreen })}>
      <header className="page__header page__header--row">
        <h1 className="page__title">채팅</h1>
        <Button iconLeft={plusIcon} onClick={() => setModal('new')}>
          새 대화
        </Button>
      </header>

      {/* 모바일 목록: 우측 하단에 떠 있는 새 채팅(방을 열면 숨김) */}
      {isMobile && !roomScreen && (
        <Button iconLeft={plusIcon} className="chat-page__fab" onClick={() => setModal('new')}>
          새 채팅
        </Button>
      )}

      <div className="chat-page__frame">
        {!roomScreen && (
          <aside className="chat-page__rooms" aria-label="대화 목록">
            <Input aria-label="대화 찾기" iconLeft={searchIcon} placeholder="대화 찾기" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            <div className="chat-page__room-list">
              {/* 방이 하나도 없으면 데스크톱은 오른쪽 대화 자리, 모바일은 목록 자리에 안내 */}
              {personalRooms.length === 0 && isMobile && <ChatRoomEmpty hasRooms={false} />}
              {personalRooms.length > 0 && visible.length === 0 && <p className="page__empty">맞는 대화가 없어요</p>}
              {visible.map((room) => (
                <ChatRoomItem
                  key={room.uuid}
                  room={room}
                  title={chatroomTitle(room)}
                  meta={roomMeta(room)}
                  selected={room.uuid === selected?.uuid}
                  onClick={() => enter(room.uuid)}
                />
              ))}
            </div>
          </aside>
        )}

        {selected ? (
          <ChatRoomView
            key={selected.uuid}
            room={selected}
            title={chatroomTitle(selected)}
            onBack={isMobile ? closeRoom : undefined}
            onInvite={() => setModal('invite')}
            onLeft={isMobile ? closeRoom : () => select(null)}
          />
        ) : (
          !isMobile && (
            <div className="chat-page__placeholder">
              <ChatRoomEmpty hasRooms={personalRooms.length > 0} />
            </div>
          )
        )}
      </div>

      {modal && (
        <ChatPeopleModal room={modal === 'invite' ? selected : null} onClose={() => setModal(null)} onDone={openRoom} />
      )}
    </div>
  );
}
