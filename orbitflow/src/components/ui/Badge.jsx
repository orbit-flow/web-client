import classNames from 'classnames';

// tone: neutral · accent · success · warning · danger · point · level / size: sm 18 · md 22
export function Badge({ tone = 'neutral', size = 'sm', solid = false, className, children }) {
  return (
    <span className={classNames('badge', `badge--${tone}`, `badge--${size}`, { 'badge--solid': solid }, className)}>
      {children}
    </span>
  );
}
