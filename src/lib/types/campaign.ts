export type CampaignRole = 'GM' | 'PLAYER';
export type CampaignStatus = 'active' | 'archived';
export type CharacterKind = 'PLAYER' | 'GM' | 'NPC';

export interface ProfileRecord {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface CampaignRecord {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignMembership {
  campaign_id: string;
  user_id: string;
  role: CampaignRole;
  active_character_id: string | null;
}

export interface CampaignInvite {
  id: string;
  campaign_id: string;
  code: string;
  role: CampaignRole;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  revoked_at: string | null;
}

export interface InviteRedemptionResult {
  campaign_id: string;
  role: CampaignRole;
  already_member: boolean;
}

export interface CampaignLogSnapshot {
  table: 'ship_ledger' | 'characters' | 'items';
  recordId?: string;
  before: unknown;
}

export interface CampaignLogEvent {
  id: string;
  campaign_id: string;
  actor_user_id: string | null;
  actor_character_id: string | null;
  actor_role: CampaignRole | null;
  event_type: string;
  event_time: string;
  campaign_day: number | null;
  summary: string;
  payload: Record<string, unknown>;
  snapshot: CampaignLogSnapshot | null;
  reverted_at: string | null;
  reverted_by: string | null;
}
