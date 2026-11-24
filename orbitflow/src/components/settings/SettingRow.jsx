// 설정 목록 한 줄: 제목 + 보조 문구 + 오른쪽 조작(버튼·스위치 등)
export function SettingRow({ title, description, children }) {
  return (
    <div className="setting-row">
      <div className="setting-row__text">
        <span className="setting-row__title">{title}</span>
        {description && <span className="setting-row__desc">{description}</span>}
      </div>
      {children}
    </div>
  );
}
