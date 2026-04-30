import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Film, Tv } from 'lucide-react'
import './ModeTabs.css'

const TABS = [
  { id: 'films',  label: 'Films',  to: '/films',  Icon: Film, color: 'var(--sg-films)' },
  { id: 'series', label: 'Séries', to: '/series', Icon: Tv,   color: 'var(--sg-series)' },
];

export function ModeTabs() {
  const { pathname, search } = useLocation();
  const activeId = pathname.startsWith('/series') ? 'series' : 'films';

  return (
    <nav className="mode-tabs" role="tablist" aria-label="Mode de jeu">
      {TABS.map(({ id, label, to, Icon, color }) => {
        const isActive = id === activeId;
        // Préserve la query string (ex: ?date=...)
        const linkTo = search && !isActive ? to + search : to;
        return (
          <Link
            key={id}
            to={linkTo}
            role="tab"
            aria-selected={isActive}
            className={`mode-tab${isActive ? ' is-active' : ''}`}
            style={isActive ? { '--mode-color': color } as React.CSSProperties : undefined}
          >
            <Icon size={14} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
