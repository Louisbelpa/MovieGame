import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Film, Tv, Landmark } from 'lucide-react'
import './ModeTabs.css'
import { FEATURES } from '@/config/features'

const ALL_TABS = [
  { id: 'films',  label: 'Films',  to: '/films',  Icon: Film,     color: 'var(--sg-films)',  enabled: true },
  { id: 'series', label: 'Séries', to: '/series', Icon: Tv,       color: 'var(--sg-series)', enabled: FEATURES.enableSeries },
  { id: 'wiki',   label: 'Personnalités',   to: '/wiki',   Icon: Landmark, color: 'var(--sg-wiki)',    enabled: FEATURES.enableWiki },
];

export function ModeTabs() {
  const { pathname, search } = useLocation();
  const tabs = ALL_TABS.filter((tab) => tab.enabled)
  if (tabs.length < 2) return null
  const activeId = pathname.startsWith('/series') ? 'series' : pathname.startsWith('/wiki') ? 'wiki' : 'films';

  return (
    <nav className="mode-tabs" aria-label="Mode de jeu">
      {tabs.map(({ id, label, to, Icon, color }) => {
        const isActive = id === activeId;
        const linkTo = search && !isActive ? to + search : to;
        return (
          <Link
            key={id}
            to={linkTo}
            aria-current={isActive ? 'page' : undefined}
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
