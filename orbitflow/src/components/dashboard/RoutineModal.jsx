import { useState } from 'react';
import { getErrorMessage } from '../../api/axios';
import { createRoutine, updateRoutine } from '../../api/routine';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { Input, TimeInput } from '../ui/Input';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { Tag } from '../ui/Tag';
import { RepeatScopeDialog } from './RepeatScopeDialog';
import { formatTime, parseLocal, toDateKey, WEEKDAYS } from '../../utils/date';
import { DURATION_TYPES, routineSummary, weekdayBit } from '../../utils/routine';
import { showErrorToast } from '../../utils/errorToast';
import { useToast } from '../../hooks/useRealtime';

const TYPE_OPTIONS = [
  { value: 'SCHEDULE', label: '일정' },
  { value: 'BACKLOG', label: '백로그' },
];
const REMIND_OPTIONS = [
  { value: 5, label: '5분 전' },
  { value: 10, label: '10분 전' },
  { value: 30, label: '30분 전' },
  { value: 60, label: '1시간 전' },
  { value: 1440, label: '하루 전' },
];
const INTERVALS = Array.from({ length: 12 }, (_, i) => i + 1);

const formatMonthDayKo = (dateKey) => {
  const date = parseLocal(dateKey);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

function initialForm(categoryId, categories) {
  const today = new Date();
  const dateKey = toDateKey(today);
  return {
    type: 'SCHEDULE',
    name: '',
    categoryId: categoryId ?? categories[0]?.id ?? '',
    durationType: 'WEEK',
    duration: 1,
    daysOfWeek: weekdayBit((today.getDay() + 6) % 7),
    date: dateKey,
    startTime: '09:00',
    endTime: '10:00',
    startDate: dateKey,
    endDate: dateKey,
    repeatEndDate: '',
    remind: false,
    remindMinutes: 10,
  };
}

// 수정할 반복 일정으로 채운 값. 첫 회차 날짜 · 시각과 리마인드(없으면 응답에서 빠진다)까지 그대로
function formFromRoutine(routine) {
  const start = parseLocal(routine.startDate);
  const end = parseLocal(routine.endDate);
  return {
    type: routine.type,
    name: routine.name,
    categoryId: routine.categoryId,
    durationType: routine.durationType,
    duration: routine.duration,
    daysOfWeek: routine.daysOfWeek ?? weekdayBit((start.getDay() + 6) % 7),
    date: toDateKey(start),
    startTime: formatTime(start),
    endTime: formatTime(end),
    startDate: toDateKey(start),
    endDate: toDateKey(end),
    repeatEndDate: routine.repeatEndDate ? toDateKey(parseLocal(routine.repeatEndDate)) : '',
    remind: routine.remindBeforeMinutes != null,
    remindMinutes: routine.remindBeforeMinutes ?? 10,
  };
}

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = '제목을 입력해 주세요';
  if (!form.categoryId) errors.categoryId = '카테고리를 골라 주세요';
  if (form.durationType === 'WEEK' && !form.daysOfWeek) errors.daysOfWeek = '요일을 하나 이상 골라 주세요';
  if (form.type === 'SCHEDULE' && form.endTime < form.startTime) errors.endTime = '시작보다 늦어야 해요';
  if (form.type === 'BACKLOG' && form.endDate < form.startDate) errors.endDate = '시작일보다 늦어야 해요';
  const first = form.type === 'SCHEDULE' ? form.date : form.startDate;
  if (form.repeatEndDate && form.repeatEndDate < first) errors.repeatEndDate = '첫 회차보다 늦어야 해요';
  return errors;
}

// 반복 일정 만들기 · 수정 창(화면 가운데). 할 일 창과 달리 반복 규칙이 처음부터 펼쳐져 있고, 하위 할 일·게시글은 없다
// categoryId: 미리 골라 둘 카테고리(카테고리 화면에서 열 때)
// routine이 있으면 그 반복을 고친다 — 저장할 때 바꿀 범위(모든 회차 · 완료하지 않은 회차만)를 묻는다
export function RoutineModal({ categoryId, categories, routine, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(routine);
  const [form, setForm] = useState(() => (editing ? formFromRoutine(routine) : initialForm(categoryId, categories)));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [askScope, setAskScope] = useState(false);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const toggleWeekday = (index) => setForm((prev) => ({ ...prev, daysOfWeek: prev.daysOfWeek ^ weekdayBit(index) }));

  const schedule = form.type === 'SCHEDULE';
  const unit = DURATION_TYPES.find((item) => item.value === form.durationType)?.unit ?? '';
  // "매주 월·수 · 09:00–10:00 · 11월 4일부터 · 12월 31일까지"
  const summary = [
    routineSummary({ durationType: form.durationType, duration: Number(form.duration), daysOfWeek: form.daysOfWeek }),
    schedule ? `${form.startTime}–${form.endTime}` : null,
    `${formatMonthDayKo(schedule ? form.date : form.startDate)}부터`,
    form.repeatEndDate ? `${formatMonthDayKo(form.repeatEndDate)}까지` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // 일정은 첫 회차 날짜의 시작·끝 시각, 백로그는 첫 회차 시작일~종료일(서버가 00:00~23:59:59로 맞춘다)
  const bodyOf = () => ({
    type: form.type,
    name: form.name.trim(),
    ...(schedule
      ? { startDate: `${form.date}T${form.startTime}:00`, endDate: `${form.date}T${form.endTime}:00` }
      : { startDate: `${form.startDate}T00:00:00`, endDate: `${form.endDate}T00:00:00` }),
    remindBeforeMinutes: form.remind ? Number(form.remindMinutes) : undefined,
    durationType: form.durationType,
    duration: Number(form.duration),
    daysOfWeek: form.durationType === 'WEEK' ? form.daysOfWeek : undefined,
    repeatEndDate: form.repeatEndDate ? `${form.repeatEndDate}T23:59:59` : undefined,
  });

  // scope는 수정할 때만(ALL · INCOMPLETE)
  const save = async (scope) => {
    setSaving(true);
    try {
      if (editing) {
        await updateRoutine(routine.id, scope, { categoryId: Number(form.categoryId), ...bodyOf() });
        toast('반복 일정을 저장했어요');
      } else {
        await createRoutine(Number(form.categoryId), bodyOf());
        toast('반복 일정을 추가했어요');
      }
      onSaved();
    } catch (err) {
      showErrorToast(getErrorMessage(err, '저장하지 못했어요. 잠시 후 다시 시도해 주세요.'));
      setSaving(false);
      setAskScope(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (editing) setAskScope(true);
    else save();
  };

  return (
    <>
      <Drawer
        busy={saving}
        title={editing ? '반복 일정 수정' : '새 반복 일정'}
        onClose={onClose}
        centered
        footer={
          <>
            <span className="drawer__spacer" />
            <Button variant="neutral" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" form="routine-form" disabled={saving}>
              저장
            </Button>
          </>
        }
      >
        <form id="routine-form" className="todo-form" onSubmit={handleSubmit}>
          <Input label="제목" value={form.name} onChange={set('name')} maxLength={100} placeholder="반복할 일 이름" error={errors.name} autoFocus />
          <Select
            label="카테고리"
            value={form.categoryId}
            onChange={set('categoryId')}
            options={categories.map((category) => ({ value: category.id, label: category.name }))}
          />
          <SegmentedControl
            options={TYPE_OPTIONS}
            value={form.type}
            onChange={(type) => setForm((prev) => ({ ...prev, type }))}
            label="종류"
            fullWidth
          />

          <div className="todo-form__repeat">
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
          </div>

          {schedule ? (
            <div className="todo-form__when">
              <Input label="첫 회차" type="date" value={form.date} onChange={set('date')} className="todo-form__grow" />
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
              <Input label="첫 회차 시작일" type="date" value={form.startDate} onChange={set('startDate')} className="todo-form__grow" />
              <Input label="첫 회차 종료일" type="date" value={form.endDate} onChange={set('endDate')} className="todo-form__grow" error={errors.endDate} />
            </div>
          )}

          <Input
            label="반복 종료일"
            type="date"
            value={form.repeatEndDate}
            onChange={set('repeatEndDate')}
            hint="비우면 계속 반복돼요"
            error={errors.repeatEndDate}
          />

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

          <p className="routine-form__summary" aria-live="polite">
            {summary}
          </p>
        </form>
      </Drawer>
      {askScope && (
        <RepeatScopeDialog
          name={routine.name}
          summary={routineSummary(routine)}
          saving={saving}
          onConfirm={save}
          onClose={() => setAskScope(false)}
        />
      )}
    </>
  );
}
