import { useEffect, useState } from 'react';
import { searchUsers } from '../../api/search';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Input } from '../ui/Input';
import searchIcon from '../../assets/icons/search.svg';

// 닉네임으로 사용자를 찾아 하나 고르는 칸. 고르면 onPick(user), 이미 고른 사람은 value로 보여 준다
// exclude: 목록에서 뺄 uuid Set(이미 구성원 등)
export function UserPicker({ label, placeholder = '닉네임으로 찾기', value, onPick, exclude }) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const query = keyword.trim();

  useEffect(() => {
    if (!query) return undefined;
    let ignore = false;
    const timer = setTimeout(() => {
      searchUsers(query, { size: 8 })
        .then((page) => !ignore && setResults(page.content))
        .catch(() => !ignore && setResults([]));
    }, 250);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query]);

  const visible = query ? results.filter((user) => !exclude?.has(user.uuid)) : [];

  return (
    <div className="user-picker">
      <Input
        label={label}
        aria-label={label ? undefined : placeholder}
        iconLeft={searchIcon}
        placeholder={placeholder}
        value={value && !open ? value.nickname : keyword}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          setKeyword(event.target.value);
          setOpen(true);
          if (value) onPick(null);
        }}
      />
      {open && query && (
        <ul className="user-picker__list" role="listbox">
          {visible.length === 0 && <li className="user-picker__empty">맞는 사용자가 없어요</li>}
          {visible.map((user) => (
            <li key={user.uuid} role="option" aria-selected={value?.uuid === user.uuid}>
              <button
                type="button"
                className="user-picker__item"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onPick(user);
                  setKeyword(user.nickname);
                  setOpen(false);
                }}
              >
                <AvatarSlot src={user.profileImage} size="xs" />
                {user.nickname}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
