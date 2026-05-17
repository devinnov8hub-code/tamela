import { supabase } from './supabase'

export const specialtyService = {
  async getAll() {
    const { data, error } = await supabase
      .from('specialties')
      .select('*')
      .order('name', { ascending: true })
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('specialties')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(specialty) {
    const { data, error } = await supabase
      .from('specialties')
      .insert([specialty])
      .select()
    if (error) throw error
    return data[0]
  },

  async update(id, specialty) {
    const { data, error } = await supabase
      .from('specialties')
      .update(specialty)
      .eq('id', id)
      .select()
    if (error) throw error
    return data[0]
  },

  async delete(id) {
    const { error } = await supabase
      .from('specialties')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
