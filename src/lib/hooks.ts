import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'

/** Mapa id -> Cliente */
export function useClientesMap() {
  return useLiveQuery(async () => {
    const arr = await db.clientes.toArray()
    return new Map(arr.map((c) => [c.id, c]))
  }, [])
}

/** Mapa id -> User */
export function useUsersMap() {
  return useLiveQuery(async () => {
    const arr = await db.users.toArray()
    return new Map(arr.map((u) => [u.id, u]))
  }, [])
}
