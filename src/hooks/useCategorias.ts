import { useCallback, useEffect, useState } from 'react'
import {
  categoriaFilterOptions,
  categoriaSelectOptions,
  getCategoriasUsuario,
} from '../services/categorias'
import {
  getSubcategorias,
  subcategoriaSelectOptions,
} from '../services/subcategorias'
import type { Categoria } from '../types/gasto'

export function useCategorias(userId: string | undefined) {
  const [categorias, setCategorias] = useState<Categoria[]>(() =>
    userId ? getCategoriasUsuario(userId) : [],
  )
  const [subcategoriasVersion, setSubcategoriasVersion] = useState(0)

  const reload = useCallback(() => {
    if (!userId) return
    setCategorias(getCategoriasUsuario(userId))
    setSubcategoriasVersion((v) => v + 1)
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  const getSubs = useCallback(
    (padre: string) => {
      void subcategoriasVersion
      return userId ? getSubcategorias(userId, padre) : []
    },
    [userId, subcategoriasVersion],
  )

  return {
    categorias,
    reloadCategorias: reload,
    selectOptions: categoriaSelectOptions(categorias),
    filterOptions: categoriaFilterOptions(categorias),
    getSubcategorias: getSubs,
    subcategoriaSelectOptions,
  }
}
