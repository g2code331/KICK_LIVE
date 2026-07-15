import { supabase } from './supabase';

// Helper to handle image uploads
export async function uploadFile(bucket: string, path: string, file: File) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true
  });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}

// TEAMS
export async function getTeams() {
  const { data, error } = await supabase.from('teams').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function createTeam(team: any) {
  const { data, error } = await supabase.from('teams').insert(team).select().single();
  if (error) throw error;
  return data;
}

// PLAYERS
export async function getPlayers(teamId?: number) {
  let query = supabase.from('players').select('*, teams(name)');
  if (teamId) query = query.eq('team_id', teamId);
  const { data, error } = await query.order('name');
  if (error) throw error;
  return data;
}

export async function createPlayer(player: any) {
  const { data, error } = await supabase.from('players').insert(player).select().single();
  if (error) throw error;
  return data;
}

// MATCHES
export async function getMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('*, homeTeam:teams!home_team_id(*), awayTeam:teams!away_team_id(*)')
    .order('start_time', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createMatch(match: any) {
  const { data, error } = await supabase.from('matches').insert(match).select().single();
  if (error) throw error;
  return data;
}

export async function updateMatch(id: number, updates: any) {
  const { data, error } = await supabase.from('matches').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// MEDIA
export async function getMedia() {
  const { data, error } = await supabase.from('media').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function publishNews(article: any) {
  const { data, error } = await supabase.from('media').insert(article).select().single();
  if (error) throw error;
  return data;
}

// SETTINGS
export async function getSettings() {
  const { data, error } = await supabase.from('app_settings').select('*');
  if (error) throw error;
  return data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
}

export async function updateSetting(key: string, value: any) {
  const { error } = await supabase.from('app_settings').upsert({ key, value, updated_at: new Date() });
  if (error) throw error;
}
