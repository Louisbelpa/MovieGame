import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Film, Tv } from 'lucide-react'
import './ModeTabs.css'
import { FEATURES } from '@/config/features'

const ALL_TABS = [
  { id: 'films',  label: 'Films',  to: '/films',  Icon: Film, color: 'var(--sg-films)' },
  { id: 'series', label: 'Séries', to: '/series', Icon: Tv,   color: 'var(--sg-series)' },
];

export function ModeTabs() {
  const { pathname, search } = useLocation();
  if (!FEATURES.enableSeries) return null
  const tabs = FEATURES.enableSeries ? ALL_TABS : ALL_TABS.filter((tab) => tab.id !== 'series')
  const activeId = pathname.startsWith('/series') && FEATURES.enableSeries ? 'series' : 'films';

  return (
    <nav className="mode-tabs" role="tablist" aria-label="Mode de jeu">
      {tabs.map(({ id, label, to, Icon, color }) => {
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
