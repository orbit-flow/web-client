// description의 줄바꿈(\n)은 그대로 줄을 나눈다
export function AuthTitle({ title, description }) {
  return (
    <div className="auth-title">
      <h1 className="auth-title__heading">{title}</h1>
      {description && <p className="auth-title__desc">{description}</p>}
    </div>
  );
}
