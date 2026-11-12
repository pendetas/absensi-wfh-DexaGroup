import { type PointerEvent, type ReactNode, useCallback, useLayoutEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router';
import { cn } from '../lib/cn';
import { AppName } from './AppName';
import { gsap } from '../lib/motion';
import { Icon, type IconName } from './Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** Match the path exactly, for the home route. */
  end?: boolean;
}

interface AppShellProps {
  /** Shown next to the product name, e.g. "HR". */
  appLabel?: string;
  nav: NavItem[];
  /** Name and NIK of the person logged in. */
  userName: string;
  userCode: string;
  children: ReactNode;
}

/**
 * A red bar under the current page that slides to whichever link the pointer is on and back,
 * so moving between pages shows where you went.
 */
function useSlidingInk(followHover: boolean) {
  const navRef = useRef<HTMLElement>(null);
  const inkRef = useRef<HTMLSpanElement>(null);
  const { pathname } = useLocation();

  const moveTo = useCallback((link: HTMLElement | null | undefined, animate = true) => {
    const ink = inkRef.current;
    if (!ink) return;
    if (!link) {
      gsap.to(ink, { opacity: 0, duration: 0.15 });
      return;
    }
    gsap.to(ink, {
      x: link.offsetLeft,
      width: link.offsetWidth,
      opacity: 1,
      duration: animate ? 0.35 : 0,
      ease: 'power3.out',
    });
  }, []);

  const current = useCallback(
    () => navRef.current?.querySelector<HTMLElement>('[aria-current="page"]'),
    [],
  );

  // Runs after NavLink has marked the new page, before paint, so the bar never flashes.
  useLayoutEffect(() => {
    const ink = inkRef.current;
    moveTo(current(), ink?.dataset.placed === 'true');
    if (ink) ink.dataset.placed = 'true';
  }, [pathname, moveTo, current]);

  useLayoutEffect(() => {
    const onResize = () => moveTo(current(), false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [moveTo, current]);

  const hoverProps = followHover
    ? {
        onPointerOver: (event: PointerEvent<HTMLElement>) =>
          moveTo((event.target as HTMLElement).closest<HTMLElement>('a')),
        onPointerLeave: () => moveTo(current()),
      }
    : {};

  return { navRef, inkRef, hoverProps };
}

/**
 * Top bar with inline navigation on wide screens; on a phone the same destinations move to a
 * bottom bar within thumb reach. No hidden menu: every destination is always visible.
 */
export function AppShell({ appLabel, nav, userName, userCode, children }: AppShellProps) {
  const top = useSlidingInk(true);
  const bottom = useSlidingInk(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-white"
      >
        Langsung ke konten
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <AppName appLabel={appLabel} className="max-sm:text-sm" />

          <nav
            ref={top.navRef}
            aria-label="Menu utama"
            className="relative hidden h-full sm:flex"
            {...top.hoverProps}
          >
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3 text-[15px] font-semibold transition-colors duration-200',
                    isActive ? 'text-ink' : 'text-ink-soft hover:text-ink active:bg-brand-wash',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <span
              ref={top.inkRef}
              aria-hidden="true"
              className="absolute bottom-[-1px] left-0 h-[3px] w-0 rounded-t bg-brand opacity-0"
            />
          </nav>

          <p className="ml-auto min-w-0 text-right text-sm leading-tight">
            <span className="block truncate font-semibold">{userName}</span>
            <span className="text-ink-soft">{userCode}</span>
          </p>
        </div>
      </header>

      {/* The bottom padding keeps the last row clear of the fixed phone navigation. */}
      <main id="konten" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-24 sm:pb-10">
        {children}
      </main>

      <nav
        ref={bottom.navRef}
        aria-label="Menu utama"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors duration-200',
                isActive ? 'text-brand' : 'text-ink-soft active:bg-brand-wash',
              )
            }
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </NavLink>
        ))}
        <span
          ref={bottom.inkRef}
          aria-hidden="true"
          className="absolute top-[-1px] left-0 h-[3px] w-0 rounded-b bg-brand opacity-0"
        />
      </nav>
    </div>
  );
}

/** Page title with an optional line of context and actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {description && <p className="text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** White surface with a hairline border: the one container style both apps use. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-lg border border-line bg-paper', className)}>
      {children}
    </section>
  );
}
