import { supabase } from './supabase'

export const reportService = {
  async getAll() {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async getByClinicianId(clinicianId) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('clinician_id', clinicianId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async create(report) {
    const { data, error } = await supabase
      .from('reports')
      .insert([report])
      .select()
    if (error) throw error
    return data[0]
  },

  async update(id, report) {
    const { data, error } = await supabase
      .from('reports')
      .update(report)
      .eq('id', id)
      .select()
    if (error) throw error
    return data[0]
  },

  async delete(id) {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async search(query) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .or(`case_title.ilike.%${query}%,transcription.ilike.%${query}%`)
    if (error) throw error
    return data
  },

  async getByStatus(status) {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async updateStatus(id, status) {
    return this.update(id, { status })
  },
}
