import { useQuery, useMutation } from '@tanstack/vue-query'
import axios from 'axios'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../stores/auth'

export const useApi = (endpoint, options = {}) => {
  const authStore = useAuthStore()

  const client = axios.create({
    baseURL: '/scribe-api',
  })

  client.interceptors.request.use((config) => {
    if (authStore.session?.access_token) {
      config.headers.Authorization = `Bearer ${authStore.session.access_token}`
    }
    return config
  })

  const query = useQuery({
    queryKey: [endpoint, options.queryKey],
    queryFn: async () => {
      const { data } = await client.get(endpoint)
      return data
    },
    ...options.queryOptions,
  })

  const create = useMutation({
    mutationFn: async (payload) => {
      const { data } = await client.post(endpoint, payload)
      return data
    },
    ...options.mutationOptions,
  })

  const update = useMutation({
    mutationFn: async ({ id, payload }) => {
      const { data } = await client.put(`${endpoint}/${id}`, payload)
      return data
    },
    ...options.mutationOptions,
  })

  const delete_item = useMutation({
    mutationFn: async (id) => {
      await client.delete(`${endpoint}/${id}`)
      return true
    },
    ...options.mutationOptions,
  })

  return {
    query,
    create,
    update,
    delete: delete_item,
  }
}

export const useSupabaseQuery = (table, options = {}) => {
  const queryKey = [table, options.queryKey]

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase.from(table).select('*')

      if (options.select) {
        query = supabase.from(table).select(options.select)
      }

      if (options.filters) {
        options.filters.forEach(([column, operator, value]) => {
          query = query.filter(column, operator, value)
        })
      }

      if (options.orderBy) {
        query = query.order(...options.orderBy)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
    ...options.queryOptions,
  })

  return query
}

export const useSupabaseMutation = (table, mutationType = 'insert', options = {}) => {
  const mutation = useMutation({
    mutationFn: async (payload) => {
      let query

      switch (mutationType) {
        case 'insert':
          query = supabase.from(table).insert(payload).select()
          break
        case 'update':
          query = supabase
            .from(table)
            .update(payload.data)
            .eq(payload.idColumn, payload.id)
            .select()
          break
        case 'delete':
          query = supabase.from(table).delete().eq('id', payload)
          break
        default:
          throw new Error(`Unknown mutation type: ${mutationType}`)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
    ...options,
  })

  return mutation
}
