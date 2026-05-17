import { supabase } from './supabase'

export const clinicianService = {
  async getAll() {
    const { data, error } = await supabase
      .from('clinicians')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('clinicians')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(clinician) {
    const { data, error } = await supabase
      .from('clinicians')
      .insert([clinician])
      .select()
    if (error) throw error
    return data[0]
  },

  async update(id, clinician) {
    const { data, error } = await supabase
      .from('clinicians')
      .update(clinician)
      .eq('id', id)
      .select()
    if (error) throw error
    return data[0]
  },

  async delete(id) {
    const { error } = await supabase
      .from('clinicians')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async search(query) {
    const { data, error } = await supabase
      .from('clinicians')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    if (error) throw error
    return data
  },

  async suspend(id) {
    return this.update(id, { status: 'suspended' })
  },

  async activate(id) {
    return this.update(id, { status: 'active' })
  },
}
