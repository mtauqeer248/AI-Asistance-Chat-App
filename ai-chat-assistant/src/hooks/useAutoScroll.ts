'use client'

import { useCallback, useEffect, useLayoutEffect, useState, type DependencyList, type RefObject } from 'react'

const THRESHOLD_PX = 80

/**
 * Sticks to the bottom while new tokens stream in, but stops following as soon
 * as the user scrolls up to read something — the behaviour people expect from chat apps.
 */
export function useAutoScroll(ref: RefObject<HTMLElement>, deps: DependencyList) {
  const [atBottom, setAtBottom] = useState(true)

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      const el = ref.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior })
    },
    [ref],
  )

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < THRESHOLD_PX)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [ref])

  useLayoutEffect(() => {
    if (atBottom) scrollToBottom('auto')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { atBottom, scrollToBottom }
}
