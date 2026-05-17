import { supabase } from './supabase'

export const departmentService = {
  async getAll() {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(department) {
    const { data, error } = await supabase
      .from('departments')
      .insert([department])
      .select()
    if (error) throw error
    return data[0]
  },

  async update(id, department) {
    const { data, error } = await supabase
      .from('departments')
      .update(department)
      .eq('id', id)
      .select()
    if (error) throw error
    return data[0]
  },

  async delete(id) {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
