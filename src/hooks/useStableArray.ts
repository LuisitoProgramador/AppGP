import { useRef } from 'react'

function shallowArrayEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  return a.every((item, index) => item === b[index])
}

/** Mantiene la referencia del array si el contenido no cambió (comparación superficial). */
export function useStableArray<T>(array: T[]): T[] {
  const ref = useRef(array)
  if (!shallowArrayEqual(array, ref.current)) {
    ref.current = array
  }
  return ref.current
}
