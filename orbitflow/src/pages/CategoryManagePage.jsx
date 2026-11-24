import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import { getErrorMessage } from '../api/axios';
import { createCategory, deleteCategory, getCategoryTodos, getMyCategories, updateCategory } from '../api/category';
import { deleteRoutine, getMyRoutines } from '../api/routine';
import { toggleTodoComplete } from '../api/todo';
import { BoardColumnHeader } from '../components/dashboard/BoardColumn';
import { RoutineModal } from '../components/dashboard/RoutineModal';
import { TodoDrawer } from '../components/dashboard/TodoDrawer';
import { TodoList } from '../components/dashboard/TodoList';
import { MobileTopBarActions, MobileTopBarTitle } from '../components/layout/MobileTopBar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ColorField, ColorSwatches } from '../components/ui/ColorField';
import { Dialog } from '../components/ui/Dialog';
import { GlyphButton } from '../components/ui/GlyphButton';
import { EmptyHint, Icon } from '../components/ui/Icon';
import { Input } from '../components/ui/Input';
import { Menu } from '../components/ui/Menu';
import { Radio } from '../components/ui/Radio';
import { formatTime, parseLocal } from '../utils/date';
import { normalizeHex } from '../utils/color';
import { routineSummary } from '../utils/routine';
import { categoryColor, groupTodos } from '../utils/todo';
import { showErrorToast } from '../utils/errorToast';
import plusIcon from '../assets/icons/plus.svg';
import trashIcon from '../assets/icons/trash.svg';
import chevronIcon from '../assets/icons/chevron-right.svg';
import { MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { useToast } from '../hooks/useRealtime';
import dashboardIcon from '../assets/icons/dashboard.svg';
import repeatIcon from '../assets/icons/repeat.svg';
import { useReload } from '../hooks/useReload';

// 피그마 추천 색
const SWATCHES = ['2F6FEB', '22A06B', '7C5CFC', 'F08C00', 'E5484D', '0EA5A4', '8A8F98'];
const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: '전체 공개' },
  { value: 'FOLLOWER', label: '팔로워 공개' },
  { value: 'PRIVATE', label: '나만 보기' },
];
const visibilityLabel = (value) => VISIBILITY_OPTIONS.find((option) => option.value === value)?.label;
const EMPTY_FORM = { name: '', color: '#2F6FEB', visibility: 'PRIVATE' };

// 카테고리 이름·색·공개 범위 관리 + 그 카테고리의 반복 일정과 할 일
// 모바일(767px 이하)은 목록(카테고리 + 전체 반복 일정)과 카테고리 편집(?category=id|new)을 따로 한 화면씩
export function CategoryManagePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [counts, setCounts] = useState({});
  const [routines, setRoutines] = useState([]);
  const [selectedId, setSelectedId] = useState(null); // 'new'면 새 카테고리
  const [todos, setTodos] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [routineModal, setRoutineModal] = useState(null); // { categoryId? } 반복 추가 · { routine } 반복 수정 창
  const [dialog, setDialog] = useState(null); // { type: 'category' } | { type: 'routine', routine }
  const [busy, setBusy] = useState(false);
  const { reloadKey, reload } = useReload();

  // 모바일은 주소의 카테고리만 연다. 없는 카테고리면 목록으로
  const editParam = isMobile ? searchParams.get('category') : null;
  const currentId = isMobile
    ? editParam === 'new'
      ? 'new'
      : (categories.find((category) => String(category.id) === editParam)?.id ?? null)
    : selectedId;
  const editScreen = isMobile && currentId != null;
  const selected = categories.find((category) => category.id === currentId);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  // 모바일: 목록에서 연 편집 화면은 기록을 하나 되돌려 닫는다(상단바 뒤로와 같게). 주소로 바로 열었으면 목록으로 바꿔 끼운다
  const pick = (id) => (isMobile ? setSearchParams({ category: String(id) }, { state: { fromList: true } }) : setSelectedId(id));
  const closeEdit = () => (location.state?.fromList ? navigate(-1) : setSearchParams({}, { replace: true }));

  // 카테고리·반복 목록과 카테고리별 할 일 수(카테고리마다 1건만 받아 전체 개수만 읽는다)
  useEffect(() => {
    let ignore = false;
    Promise.all([getMyCategories(), getMyRoutines()])
      .then(async ([myCategories, myRoutines]) => {
        if (ignore) return;
        setCategories(myCategories);
        setRoutines(myRoutines);
        setSelectedId((prev) => prev ?? myCategories[0]?.id ?? 'new');
        const pages = await Promise.all(myCategories.map((category) => getCategoryTodos(category.id, { size: 1 })));
        if (!ignore) setCounts(Object.fromEntries(myCategories.map((category, i) => [category.id, pages[i].totalElements])));
      })
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '카테고리를 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!selected) return;
    let ignore = false;
    getCategoryTodos(selected.id)
      .then((page) => !ignore && setTodos(page.content))
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '할 일을 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [selected, reloadKey]);

  const run = async (task, fallback) => {
    setBusy(true);
    try {
      await task();
      reload();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    } finally {
      setBusy(false);
      setDialog(null);
    }
  };

  const handleSave = (body) =>
    run(async () => {
      if (selected) {
        await updateCategory(selected.id, body);
        toast('카테고리를 저장했어요');
      } else {
        const created = await createCategory(body);
        setSelectedId(created.id);
        toast('카테고리를 만들었어요');
      }
      if (isMobile) closeEdit();
    }, '저장하지 못했어요.');

  const categoryRoutines = routines.filter((routine) => routine.categoryId === selected?.id);
  // 반복 일정은 위 "반복 일정" 표에 있으니, 반복으로 생긴 회차(와 그 하위 할 일)는 할 일 목록에서 뺀다
  const routineTodoIds = new Set(todos.filter((todo) => todo.routineId).map((todo) => todo.id));
  const categoryTodos = groupTodos(todos.filter((todo) => !todo.routineId && !routineTodoIds.has(todo.parentTodoId)));

  return (
    <div className="page category-page">
      <header className="page__header">
        <h1 className="page__title">카테고리 · 반복</h1>
        <p className="page__subtitle">카테고리마다 색과 공개 범위를 정하고, 반복 일정을 관리해요</p>
      </header>

      <MobileTopBarTitle>{editScreen ? (selected ? '카테고리 편집' : '새 카테고리') : '할 일'}</MobileTopBarTitle>
      {isMobile && (
        <MobileTopBarActions>
          {editScreen && selected && (
            <GlyphButton icon={plusIcon} label="할 일 추가" onClick={() => setDrawer({ defaults: { categoryId: selected.id } })} />
          )}
        </MobileTopBarActions>
      )}

      <div className="category-page__columns">
        {!editScreen && (
          <section className="category-page__list" aria-label="내 카테고리">
            <div className="section-header">
              <h2 className="section-header__title">내 카테고리</h2>
              <Badge>{categories.length}</Badge>
              {/* 모바일은 목록 아래 버튼 대신 이 줄 오른쪽 */}
              {isMobile && (
                <Button variant="secondary" size="md" iconLeft={plusIcon} className="section-header__action" onClick={() => pick('new')}>
                  새 카테고리
                </Button>
              )}
            </div>
            <ul className="category-list">
              {categories.map((category) => (
                <li key={category.id}>
                  <button
                    type="button"
                    className={classNames('category-list__item', {
                      'category-list__item--selected': category.id === currentId,
                    })}
                    onClick={() => pick(category.id)}
                  >
                    <span className="category-list__color" style={{ backgroundColor: categoryColor(category.color) }} />
                    <span className="category-list__text">
                      <span className="category-list__name">{category.name}</span>
                      <span className="category-list__visibility">{visibilityLabel(category.visibility)}</span>
                    </span>
                    {counts[category.id] != null && <span className="category-list__count num">{counts[category.id]}개</span>}
                    {isMobile && <Icon src={chevronIcon} size={20} className="category-list__chevron" />}
                  </button>
                </li>
              ))}
              {categories.length === 0 && (
                <li className="category-list__empty">
                  <EmptyHint icon={dashboardIcon} title="카테고리가 없어요" />
                </li>
              )}
            </ul>
            <Button variant="neutral" size="md" iconLeft={plusIcon} fullWidth className="category-page__new" onClick={() => pick('new')}>
              새 카테고리
            </Button>
          </section>
        )}

        {/* 모바일 목록 화면: 카테고리 아래에 모든 반복 일정 */}
        {isMobile && !editScreen && (
          <section className="category-page__routines" aria-label="반복 일정">
            <div className="section-header">
              <h2 className="section-header__title">반복 일정</h2>
              <Badge>{routines.length}</Badge>
              {categories.length > 0 && (
                <Button
                  variant="secondary"
                  size="md"
                  iconLeft={plusIcon}
                  className="section-header__action"
                  onClick={() => setRoutineModal({})}
                >
                  반복 추가
                </Button>
              )}
            </div>
            {routines.length > 0 ? (
              // 카테고리 순서대로, 반복이 있는 카테고리마다 머리(색 · 이름 · 개수) 아래에 그 반복들
              categories
                .filter((category) => routines.some((routine) => routine.categoryId === category.id))
                .map((category) => {
                  const items = routines.filter((routine) => routine.categoryId === category.id);
                  return (
                    <div key={category.id} className="routine-group">
                      <h3 className="routine-group__title">
                        <span className="category-list__color" style={{ backgroundColor: categoryColor(category.color) }} />
                        {category.name}
                        <span className="routine-group__count num">{items.length}</span>
                      </h3>
                      <RoutineTable routines={items} onEdit={(routine) => setRoutineModal({ routine })} onDelete={(routine) => setDialog({ type: 'routine', routine })} />
                    </div>
                  );
                })
            ) : (
              <EmptyHint icon={repeatIcon} title="반복 일정이 없어요" />
            )}
          </section>
        )}

        {(!isMobile || editScreen) && (
          <div className="category-page__detail">
            <CategoryEditForm
              key={currentId ?? 'none'}
              category={selected}
              busy={busy}
              onSubmit={handleSave}
              onDelete={() => setDialog({ type: 'category' })}
            />

            {selected && !isMobile && (
              <section className="card" aria-label="반복 일정">
                <BoardColumnHeader title="반복 일정" count={categoryRoutines.length}>
                  <Button
                    variant="secondary"
                    size="md"
                    iconLeft={plusIcon}
                    onClick={() => setRoutineModal({ categoryId: selected.id })}
                  >
                    반복 추가
                  </Button>
                </BoardColumnHeader>
                {categoryRoutines.length > 0 ? (
                  <RoutineTable routines={categoryRoutines} onEdit={(routine) => setRoutineModal({ routine })} onDelete={(routine) => setDialog({ type: 'routine', routine })} />
                ) : (
                  <EmptyHint icon={repeatIcon} title="이 카테고리의 반복 일정이 없어요" />
                )}
              </section>
            )}

            {selected && (
              <section className="card" aria-label="이 카테고리의 할 일">
                <BoardColumnHeader title="이 카테고리의 할 일" count={categoryTodos.length}>
                  <Button
                    variant="secondary"
                    size="md"
                    iconLeft={plusIcon}
                    className="category-page__todo-add"
                    onClick={() => setDrawer({ defaults: { categoryId: selected.id } })}
                  >
                    할 일 추가
                  </Button>
                </BoardColumnHeader>
                <TodoList
                  todos={categoryTodos.map((todo) => ({ ...todo, type: 'BACKLOG' }))}
                  categoriesById={categoriesById}
                  actions={{
                    onToggle: (todo) =>
                      run(async () => {
                        const updated = await toggleTodoComplete(todo.id);
                        if (updated?.isCompleted) toast('할 일을 완료했어요');
                      }, '완료 표시를 바꾸지 못했어요.'),
                    onOpen: (todo) => setDrawer({ todoId: todo.id }),
                    onToggleSubtask: (id) => run(() => toggleTodoComplete(id), '완료 표시를 바꾸지 못했어요.'),
                    onReorderSubtasks: () => {},
                  }}
                  empty="이 카테고리의 할 일이 없어요"
                />
              </section>
            )}
          </div>
        )}
      </div>

      {dialog?.type === 'category' && selected && (
        <Dialog
          busy={busy}
          title="카테고리 삭제"
          description={`"${selected.name}"의 할 일·반복 일정·게시글이 모두 함께 지워지고 되돌릴 수 없어요.`}
          onClose={() => setDialog(null)}
          actions={
            <>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await deleteCategory(selected.id);
                    setSelectedId(null);
                    if (isMobile) closeEdit();
                    toast('카테고리를 삭제했어요');
                  }, '삭제하지 못했어요.')
                }
              >
                삭제
              </Button>
              <Button variant="neutral" onClick={() => setDialog(null)}>
                취소
              </Button>
            </>
          }
        />
      )}
      {dialog?.type === 'routine' && (
        <Dialog
          busy={busy}
          title="반복 일정 삭제"
          description={`"${dialog.routine.name}" 반복을 지워요. 완료한 회차는 일반 할 일로 남고, 완료하지 않은 회차는 함께 지워져요.`}
          onClose={() => setDialog(null)}
          actions={
            <>
              <Button variant="danger" disabled={busy} onClick={() => run(() => deleteRoutine(dialog.routine.id), '삭제하지 못했어요.')}>
                삭제
              </Button>
              <Button variant="neutral" onClick={() => setDialog(null)}>
                취소
              </Button>
            </>
          }
        />
      )}
      {routineModal && categories.length > 0 && (
        <RoutineModal
          categoryId={routineModal.categoryId}
          routine={routineModal.routine}
          categories={categories}
          onClose={() => setRoutineModal(null)}
          onSaved={() => {
            setRoutineModal(null);
            reload();
          }}
        />
      )}
      {drawer && categories.length > 0 && (
        <TodoDrawer
          key={drawer.todoId ?? 'new'}
          todoId={drawer.todoId}
          defaults={drawer.defaults}
          categories={categories}
          onClose={() => setDrawer(null)}
          onSaved={() => {
            setDrawer(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

// 반복 일정 표(한 카테고리 것). 모바일 전체 목록은 카테고리별로 묶어 표를 여러 개 쓴다
// 줄 끝 ⋯ 를 누르면 수정 · 삭제 메뉴
function RoutineTable({ routines, onEdit, onDelete }) {
  return (
    <div className="data-table" role="table">
      <div className="data-table__head" role="row">
        <span role="columnheader" className="data-table__grow routine-col--name">이름</span>
        <span role="columnheader" className="routine-col--type">종류</span>
        <span role="columnheader" className="routine-col--cycle">반복</span>
        <span role="columnheader" className="routine-col--time">시간</span>
        <span role="columnheader" className="routine-col--more" />
      </div>
      {routines.map((routine) => (
        <div key={routine.id} className="data-table__row" role="row">
          <span role="cell" className="data-table__grow routine-col--name">{routine.name}</span>
          <span role="cell" className="routine-col--type">{routine.type === 'SCHEDULE' ? '일정' : '백로그'}</span>
          <span role="cell" className="routine-col--cycle">{routineSummary(routine)}</span>
          <span role="cell" className={classNames('routine-col--time num', { 'routine-col--blank': routine.type !== 'SCHEDULE' })}>
            {routine.type === 'SCHEDULE'
              ? `${formatTime(parseLocal(routine.startDate))}–${formatTime(parseLocal(routine.endDate))}`
              : '—'}
          </span>
          <span role="cell" className="routine-col--more">
            <Menu
              label={`${routine.name} 메뉴`}
              items={[
                { label: '수정', onClick: () => onEdit(routine) },
                { label: '삭제', danger: true, onClick: () => onDelete(routine) },
              ]}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

// 카테고리 이름·색·공개 범위 편집. 고른 카테고리가 바뀔 때마다 key로 새로 만들어 값을 다시 채운다
function CategoryEditForm({ category, busy, onSubmit, onDelete }) {
  const [form, setForm] = useState(() =>
    category ? { name: category.name, color: `#${category.color}`, visibility: category.visibility } : EMPTY_FORM,
  );
  const [errors, setErrors] = useState({});

  const handleSubmit = (event) => {
    event.preventDefault();
    const color = normalizeHex(form.color);
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = '이름을 입력해 주세요';
    if (!color) nextErrors.color = '6자리 색 코드로 입력해 주세요(예: #2F6FEB)';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({ name: form.name.trim(), color: color.slice(1), visibility: form.visibility });
  };

  return (
    <form className="card category-edit" onSubmit={handleSubmit}>
      <div className="section-header">
        <h2 className="section-header__title">{category ? '카테고리 편집' : '새 카테고리'}</h2>
        {category && <span className="section-header__hint">{category.name}</span>}
      </div>
      <div className="category-edit__row">
        <Input
          label="이름"
          value={form.name}
          maxLength={50}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          error={errors.name}
          className="category-edit__name"
        />
        <ColorField
          value={form.color}
          onChange={(color) => setForm((prev) => ({ ...prev, color }))}
          error={errors.color}
          className="category-edit__color"
        />
      </div>
      <ColorSwatches
        label="추천 색"
        colors={SWATCHES}
        value={form.color}
        onChange={(color) => setForm((prev) => ({ ...prev, color }))}
      />
      <fieldset className="category-edit__visibility">
        <legend>공개 범위</legend>
        <div className="category-edit__options">
          {VISIBILITY_OPTIONS.map((option) => (
            <Radio
              key={option.value}
              name="category-visibility"
              label={option.label}
              checked={form.visibility === option.value}
              onChange={() => setForm((prev) => ({ ...prev, visibility: option.value }))}
            />
          ))}
        </div>
      </fieldset>
      <div className="category-edit__actions">
        {category && (
          <Button variant="neutral" size="md" iconLeft={trashIcon} className="btn--muted" onClick={onDelete}>
            카테고리 삭제
          </Button>
        )}
        <Button type="submit" size="md" disabled={busy}>
          저장
        </Button>
      </div>
    </form>
  );
}
