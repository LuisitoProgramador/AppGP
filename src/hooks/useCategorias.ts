import { useCallback, useEffect, useState } from 'react'
import {
  categoriaFilterOptions,
  categoriaSelectOptions,
  getCategoriasUsuario,
} from '../services/categorias'
import type { Categoria } from '../types/gasto'

export function useCategorias(userId: string | undefined) {
  const [categorias, setCategorias] = useState<Categoria[]>(() =>
    userId ? getCategoriasUsuario(userId) : [],
  )

  const reload = useCallback(() => {
    if (!userId) return
    setCategorias(getCategoriasUsuario(userId))
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  return {
    categorias,
    reloadCategorias: reload,
    selectOptions: categoriaSelectOptions(categorias),
    filterOptions: categoriaFilterOptions(categorias),
  }
}
