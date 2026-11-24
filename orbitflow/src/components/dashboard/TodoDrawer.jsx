import { useCallback, useEffect, useState } from 'react';
import { getMyUuid } from '../../api/avatar';
import { getErrorMessage } from '../../api/axios';
import { getTodoPosts } from '../../api/post';
import { ComposePostModal } from '../social/ComposePostModal';
import { PostDetailModal } from '../social/PostDetailModal';
import { EmptyHint } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import openIcon from '../../assets/icons/open.svg';
import { getCategoryTodos } from '../../api/category';
import { createRoutine, getRoutine, updateRoutine } from '../../api/routine';
import { changeTodoAssignee, createTodo, deleteTodo, getTodo, reorderChildTodos, toggleTodoComplete, updateTodo } from '../../api/todo';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Drawer } from '../ui/Drawer';
import { Input, TimeInput } from '../ui/Input';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { Tag } from '../ui/Tag';
import { RepeatScopeDialog } from './RepeatScopeDialog';
import { SubtaskList } from './SubtaskList';
import { formatTime, parseLocal, toDateKey, WEEKDAYS } from '../../utils/date';

const formatMonthDayKo = (date) => `${date.getMonth() + 1}월 ${date.getDate()}일`;
import { DURATION_TYPES, routineSummary, weekdayBit } from '../../utils/routine';
import { isOverdue } from '../../utils/todo';
import { showErrorToast } from '../../utils/errorToast';
import plusIcon from '../../assets/icons/plus.svg';
import imageIcon from '../../assets/icons/image.svg';
import trashIcon from '../../assets/icons/trash.svg';
import { useToast } from '../../hooks/useRealtime';

const TYPE_OPTIONS = [
  { value: 'BACKLOG', label: '백로그' },
  { value: 'SCHEDULE', label: '일정' },
];
const REMIND_OPTIONS = [
  { value: 5, label: '5분 전' },
  { value: 10, label: '10분 전' },
  { value: 30, label: '30분 전' },
  { value: 60, label: '1시간 전' },
  { value: 1440, label: '하루 전' },
];
const INTERVALS = Array.from({ length: 12 }, (_, i) => i + 1);

function initialForm(defaults, categories) {
  const date = defaults?.date ?? new Date();
  const dateKey = toDateKey(date);
  return {
    type: defaults?.type ?? 'SCHEDULE',
    name: '',
    categoryId: defaults?.categoryId ?? categories[0]?.id ?? '',
    date: dateKey,
    startTime: '09:00',
    endTime: '10:00',
    startDate: dateKey,
    endDate: dateKey,
    repeat: defaults?.repeat ?? false,
    durationType: 'WEEK',
    duration: 1,
    daysOfWeek: weekdayBit((date.getDay() + 6) % 7),
    repeatEndDate: '',
    remind: false,
    remindMinutes: 10,
    assigneeUuid: defaults?.assigneeUuid ?? '',
  };
}

function formFromTodo(todo) {
  const start = parseLocal(todo.startDate);
  const end = parseLocal(todo.endDate);
  return {
    type: todo.type,
    name: todo.name,
    categoryId: todo.categoryId,
    date: toDateKey(start),
    startTime: formatTime(start),
    endTime: formatTime(end),
    startDate: toDateKey(start),
    endDate: toDateKey(end),
    repeat: Boolean(todo.routineId),
    remind: todo.remindBeforeMinutes != null,
    remindMinutes: todo.remindBeforeMinutes ?? 10,
    assigneeUuid: todo.assigneeUuid ?? '',
  };
}

function formFromRoutine(routine) {
  const start = parseLocal(routine.startDate);
  return {
    durationType: routine.durationType,
    duration: routine.duration,
    daysOfWeek: routine.daysOfWeek ?? weekdayBit((start.getDay() + 6) % 7),
    repeatEndDate: routine.repeatEndDate ? toDateKey(parseLocal(routine.repeatEndDate)) : '',
  };
}

// 일정은 하루 안의 시작·끝 시각, 백로그는 시작일~종료일(서버가 00:00~23:59:59로 맞춘다)
function periodOf(form) {
  if (form.type === 'SCHEDULE') {
    return { startDate: `${form.date}T${form.startTime}:00`, endDate: `${form.date}T${form.endTime}:00` };
  }
  return { startDate: `${form.startDate}T00:00:00`, endDate: `${form.endDate}T00:00:00` };
}

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = '제목을 입력해 주세요';
  if (!form.categoryId) errors.categoryId = '카테고리를 골라 주세요';
  if (form.type === 'SCHEDULE' && form.endTime < form.startTime) errors.endTime = '시작보다 늦어야 해요';
  if (form.type === 'BACKLOG' && form.endDate < form.startDate) errors.endDate = '시작일보다 늦어야 해요';
  if (form.repeat && form.durationType === 'WEEK' && !form.daysOfWeek) errors.daysOfWeek = '요일을 하나 이상 골라 주세요';
  return errors;
}

// 할 일 추가·수정 창(화면 가운데). todoId가 없으면 새 할 일(defaults: { date, categoryId, type, repeat })
// 반복 회차를 고치면 반복 자체를 바꾸므로 범위(모든 회차 / 미완료 회차)를 먼저 묻는다
// 팀 할 일이면 assignees([{ value: uuid, label }])로 담당자 칸을 보여 준다. canAssign이 없으면 읽기만
export function TodoDrawer({ todoId, defaults, categories, assignees, canAssign = false, onClose, onSaved }) {
  const toast = useToast();
  const editing = todoId != null;
  const [todo, setTodo] = useState(null);
  const [routine, setRoutine] = useState(null);
  const [children, setChildren] = useState([]);
  const [form, setForm] = useState(() => initialForm(defaults, categories));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState(null); // 'scope' | 'delete'
  const [newSubtask, setNewSubtask] = useState(null);
  const [todoPosts, setTodoPosts] = useState([]);
  const [myUuid, setMyUuid] = useState(null);
  const [postPanel, setPostPanel] = useState(null); // { type: 'compose' } | { type: 'detail', postId }

  const reloadPosts = async () => setTodoPosts((await getTodoPosts(todo.id)).content);

  const loadChildren = useCallback(async (parent) => {
    // 자식만 따로 주는 API가 없어 카테고리 할 일 목록에서 고른다(최근 100개 안)
    const page = await getCategoryTodos(parent.categoryId);
    setChildren(page.content.filter((item) => item.parentTodoId === parent.id).sort((a, b) => a.sortOrder - b.sortOrder));
  }, []);

  useEffect(() => {
    if (!editing) return;
    let ignore = false;
    (async () => {
      try {
        const loaded = await getTodo(todoId);
        if (ignore) return;
        setTodo(loaded);
        setForm((prev) => ({ ...prev, ...formFromTodo(loaded) }));
        if (loaded.routineId) {
          const loadedRoutine = await getRoutine(loaded.routineId);
          if (ignore) return;
          setRoutine(loadedRoutine);
          setForm((prev) => ({ ...prev, ...formFromRoutine(loadedRoutine) }));
        }
        if (!loaded.parentTodoId) await loadChildren(loaded);
        const [uuid, posts] = await Promise.all([getMyUuid(), getTodoPosts(loaded.id)]);
        if (ignore) return;
        setMyUuid(uuid);
        setTodoPosts(posts.content);
      } catch (err) {
        if (!ignore) showErrorToast(getErrorMessage(err, '할 일을 불러오지 못했어요.'));
      }
    })();
    return () => {
      ignore = true;
    };
  }, [editing, todoId, loadChildren]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const toggleWeekday = (index) => setForm((prev) => ({ ...prev, daysOfWeek: prev.daysOfWeek ^ weekdayBit(index) }));

  const save = async (scope) => {
    const remindBeforeMinutes = form.remind ? Number(form.remindMinutes) : undefined;
    const base = { type: form.type, name: form.name.trim(), ...periodOf(form), remindBeforeMinutes };
    const repeatFields = {
      durationType: form.durationType,
      duration: Number(form.duration),
      daysOfWeek: form.durationType === 'WEEK' ? form.daysOfWeek : undefined,
      repeatEndDate: form.repeatEndDate ? `${form.repeatEndDate}T23:59:59` : undefined,
    };
    const categoryId = Number(form.categoryId);
    const assigneeUuid = assignees && form.assigneeUuid ? form.assigneeUuid : undefined;

    setSaving(true);
    try {
      if (!editing) {
        if (form.repeat) await createRoutine(categoryId, { ...base, ...repeatFields, assigneeUuid });
        else await createTodo(categoryId, { ...base, assigneeUuid });
      } else if (routine) {
        // 반복의 첫 회차 날짜는 그대로 두고 시각만 바꾼다(회차 시각 = 첫 회차 시각)
        const firstStart = routine.startDate.split('T')[0];
        const firstEnd = routine.endDate.split('T')[0];
        const routinePeriod =
          form.type === 'SCHEDULE'
            ? { startDate: `${firstStart}T${form.startTime}:00`, endDate: `${firstEnd}T${form.endTime}:00` }
            : { startDate: routine.startDate, endDate: routine.endDate };
        await updateRoutine(routine.id, scope, { categoryId, ...base, ...routinePeriod, ...repeatFields });
      } else {
        await updateTodo(todo.id, { categoryId, ...base });
      }
      // 담당자는 수정(PUT)에 들어가지 않아 따로 바꾼다
      if (editing && todo && assigneeUuid && assigneeUuid !== todo.assigneeUuid) await changeTodoAssignee(todo.id, assigneeUuid);
      toast(editing ? '할 일을 저장했어요' : '할 일을 추가했어요');
      onSaved();
    } catch (err) {
      showErrorToast(getErrorMessage(err, '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'));
      setSaving(false);
      setDialog(null);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (routine) {
      setDialog('scope');
      return;
    }
    save();
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteTodo(todo.id);
      toast('할 일을 삭제했어요');
      onSaved();
    } catch (err) {
      showErrorToast(getErrorMessage(err, '삭제하지 못했어요.'));
      setSaving(false);
      setDialog(null);
    }
  };

  const runChildTask = async (task) => {
    try {
      await task();
      await loadChildren(todo);
    } catch (err) {
      showErrorToast(getErrorMessage(err, '하위 할 일을 바꾸지 못했어요.'));
    }
  };

  const addSubtask = () => {
    const name = newSubtask.trim();
    if (!name) return;
    runChildTask(() =>
      createTodo(todo.categoryId, {
        type: todo.type,
        name,
        startDate: todo.startDate,
        endDate: todo.endDate,
        parentTodoId: todo.id,
      }),
    );
    setNewSubtask(null);
  };

  const schedule = form.type === 'SCHEDULE';
  const unit = DURATION_TYPES.find((item) => item.value === form.durationType)?.unit ?? '';
  const showSubtasks = editing && todo && !todo.parentTodoId;

  return (
    <>
      <Drawer
        busy={saving}
        title={editing ? '할 일' : '새 할 일'}
        onClose={onClose}
        centered
        footer={
          <>
            {editing && todo && (
              <Button variant="ghost" iconLeft={trashIcon} className="drawer__delete" onClick={() => setDialog('delete')}>
                삭제
              </Button>
            )}
            <span className="drawer__spacer" />
            <Button variant="neutral" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" form="todo-form" disabled={saving || (editing && !todo)}>
              저장
            </Button>
          </>
        }
      >
        <form id="todo-form" className="todo-form" onSubmit={handleSubmit}>
          <SegmentedControl
            options={TYPE_OPTIONS}
            value={form.type}
            onChange={(type) => setForm((prev) => ({ ...prev, type }))}
            label="종류"
            fullWidth
          />
          <Input label="제목" value={form.name} onChange={set('name')} maxLength={100} placeholder="할 일 이름" error={errors.name} autoFocus={!editing} />
          <Select
            label="카테고리"
            value={form.categoryId}
            onChange={set('categoryId')}
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
          />
          {assignees && (
            <Select
              label="담당자"
              value={form.assigneeUuid}
              onChange={set('assigneeUuid')}
              options={[{ value: '', label: editing ? '그대로 두기' : '나 (만든 사람)' }, ...assignees]}
              disabled={!canAssign}
              hint={canAssign ? undefined : '다른 사람에게 맡기려면 할 일 맡기기 권한이 필요해요'}
            />
          )}

          {schedule ? (
            <div className="todo-form__when">
              <Input label="날짜" type="date" value={form.date} onChange={set('date')} className="todo-form__grow" />
              <TimeInput label="시작" value={form.startTime} onChange={(startTime) => setForm((prev) => ({ ...prev, startTime }))} className="todo-form__time" />
              <TimeInput
                label="종료"
                value={form.endTime}
                onChange={(endTime) => setForm((prev) => ({ ...prev, endTime }))}
                className="todo-form__time"
                error={errors.endTime}
              />
            </div>
          ) : (
            <div className="todo-form__when">
              <Input label="시작일" type="date" value={form.startDate} onChange={set('startDate')} className="todo-form__grow" />
              <Input label="종료일" type="date" value={form.endDate} onChange={set('endDate')} className="todo-form__grow" error={errors.endDate} />
            </div>
          )}

          <div className="todo-form__repeat">
            <Switch
              label="반복"
              checked={form.repeat}
              onChange={(event) => setForm((prev) => ({ ...prev, repeat: event.target.checked }))}
              disabled={editing}
            />
            {editing && !routine && <p className="field__hint">반복은 새 할 일을 만들 때 정할 수 있어요</p>}
            {form.repeat && (
              <>
                <div className="todo-form__cycle">
                  <Select label="주기" value={form.durationType} onChange={set('durationType')} options={DURATION_TYPES} className="todo-form__grow" />
                  <Select
                    label="간격"
                    value={form.duration}
                    onChange={set('duration')}
                    options={INTERVALS.map((n) => ({ value: n, label: `${n}${unit}마다` }))}
                    className="todo-form__interval"
                  />
                </div>
                {form.durationType === 'WEEK' && (
                  <div className="todo-form__weekdays" role="group" aria-label="반복 요일">
                    {WEEKDAYS.map((name, index) => (
                      <Tag key={name} size="lg" selected={Boolean(form.daysOfWeek & weekdayBit(index))} onClick={() => toggleWeekday(index)}>
                        {name}
                      </Tag>
                    ))}
                  </div>
                )}
                {errors.daysOfWeek && <p className="field__hint field__hint--error">{errors.daysOfWeek}</p>}
                <Input label="종료일" type="date" value={form.repeatEndDate} onChange={set('repeatEndDate')} hint="비우면 계속 반복돼요" />
              </>
            )}
          </div>

          <div className="todo-form__remind">
            <Switch
              label="리마인드"
              checked={form.remind}
              onChange={(event) => setForm((prev) => ({ ...prev, remind: event.target.checked }))}
            />
            <span className="drawer__spacer" />
            <Select
              aria-label="리마인드 시점"
              value={form.remindMinutes}
              onChange={set('remindMinutes')}
              options={REMIND_OPTIONS}
              disabled={!form.remind}
              className="todo-form__remind-select"
            />
          </div>

          {showSubtasks && (
            <section className="todo-form__section" aria-label="하위 할 일">
              <div className="todo-form__section-header">
                <h3 className="todo-form__section-title">하위 할 일</h3>
                <Badge>
                  {children.filter((child) => child.isCompleted).length}/{children.length}
                </Badge>
                {children.length > 1 && <span className="todo-form__section-hint">⋮⋮ 끌어서 순서 변경</span>}
              </div>
              {children.length > 0 && (
                <SubtaskList
                  items={children.map((child) => ({ id: child.id, name: child.name, done: child.isCompleted, overdue: isOverdue(child) }))}
                  onToggle={(id) => runChildTask(() => toggleTodoComplete(id))}
                  onReorder={(ids) => runChildTask(() => reorderChildTodos(todo.id, ids))}
                />
              )}
              {newSubtask == null ? (
                <Button variant="ghost" dense iconLeft={plusIcon} onClick={() => setNewSubtask('')} className="todo-form__add-subtask">
                  하위 할 일 추가
                </Button>
              ) : (
                <div className="todo-form__new-subtask">
                  <Input
                    aria-label="하위 할 일 이름"
                    value={newSubtask}
                    onChange={(event) => setNewSubtask(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addSubtask();
                      }
                    }}
                    maxLength={100}
                    autoFocus
                  />
                  <Button dense onClick={addSubtask}>
                    추가
                  </Button>
                </div>
              )}
            </section>
          )}

          {editing && todo && (
            <section className="todo-form__section" aria-label="이 할 일의 게시글">
              <div className="todo-form__section-header">
                <h3 className="todo-form__section-title">이 할 일의 게시글</h3>
                <Badge>{todoPosts.length}</Badge>
                <Button variant="secondary" iconLeft={plusIcon} className="section-header__action" onClick={() => setPostPanel({ type: 'compose' })}>
                  글 쓰기
                </Button>
              </div>
              {todoPosts.length === 0 && <EmptyHint icon={imageIcon} title="이 할 일에 대한 게시글이 없어요" />}
              {todoPosts.length > 0 && (
                <ul className="todo-posts">
                  {todoPosts.map((post) => (
                    <li key={post.id} className="todo-posts__row">
                      <div className="todo-posts__text">
                        <span className="todo-posts__content">{post.content}</span>
                        <span className="todo-posts__meta num">
                          {formatMonthDayKo(parseLocal(post.createdAt))} · 좋아요 {post.likeCount} · 댓글 {post.commentCount}
                        </span>
                      </div>
                      <IconButton icon={openIcon} label="게시글 열기" onClick={() => setPostPanel({ type: 'detail', postId: post.id })} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </form>
      </Drawer>

      {postPanel?.type === 'compose' && (
        <ComposePostModal
          todo={{
            id: todo.id,
            name: todo.name,
            isCompleted: todo.isCompleted,
            visibility: categories.find((category) => category.id === todo.categoryId)?.visibility,
            teamCategory: categories.find((category) => category.id === todo.categoryId)?.teamCategory,
          }}
          onClose={() => setPostPanel(null)}
          onSaved={() => {
            setPostPanel(null);
            reloadPosts();
          }}
        />
      )}
      {postPanel?.type === 'detail' && (
        <PostDetailModal
          postId={postPanel.postId}
          myUuid={myUuid}
          categoriesById={new Map(categories.map((category) => [category.id, category]))}
          onClose={() => setPostPanel(null)}
          onChanged={reloadPosts}
        />
      )}

      {dialog === 'scope' && routine && (
        <RepeatScopeDialog name={form.name} summary={routineSummary(routine)} saving={saving} onConfirm={save} onClose={() => setDialog(null)} />
      )}
      {dialog === 'delete' && (
        <Dialog
          busy={saving}
          title="할 일 삭제"
          description="하위 할 일과 이 할 일의 게시글도 함께 지워지고 되돌릴 수 없어요."
          onClose={() => setDialog(null)}
          actions={
            <>
              <Button variant="danger" onClick={handleDelete} disabled={saving}>
                삭제
              </Button>
              <Button variant="neutral" onClick={() => setDialog(null)}>
                취소
              </Button>
            </>
          }
        />
      )}
    </>
  );
}
