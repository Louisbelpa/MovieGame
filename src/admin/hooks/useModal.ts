import { useState } from 'react'

export function useModal<T extends { type: string }>() {
  const [modal, setModal] = useState<T | null>(null)
  const close = () => setModal(null)
  return { modal, setModal, close }
}
