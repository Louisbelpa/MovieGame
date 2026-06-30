import { useState, useEffect } from 'react'

export function getSecondsUntilMidnightParis(): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  })
  const parts = formatter.formatToParts(new Date())
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)
  return 24 * 3600 - (get('hour') * 3600 + get('minute') * 60 + get('second'))
}

export function NextGameCountdown() {
  const [secs, setSecs] = useState(getSecondsUntilMidnightParis)

  useEffect(() => {
    const id = setInterval(() => setSecs(getSecondsUntilMidnightParis()), 1000)
    return () => clearInterval(id)
  }, [])

  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return (
    <strong className="text-film-text tabular-nums">
      {h}h{String(m).padStart(2, '0')}m{String(s).padStart(2, '0')}s
    </strong>
  )
}
