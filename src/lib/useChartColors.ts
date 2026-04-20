import { useEffect, useState } from 'react'

export function useChartColors() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return {
    tick:    isDark ? '#94a3b8' : '#334155',
    tooltip: { bg: isDark ? 'hsl(263 25% 13%)' : '#ffffff', border: isDark ? 'hsl(263 20% 26%)' : 'hsl(263 20% 82%)' },
  }
}
