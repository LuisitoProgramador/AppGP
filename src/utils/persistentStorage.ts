/** Pide a Safari/iOS que no borre localStorage por presión de almacenamiento. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (!navigator.storage?.persist) return
    await navigator.storage.persist()
  } catch {
    // Sin soporte o permiso denegado — la sesión sigue en localStorage.
  }
}
