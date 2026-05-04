/**
 * Map Supabase `leads` rows to the client `Lead` store shape.
 * Dependencies: leadStore types. Env: N/A.
 */

import type { Lead } from "@/store/leadStore";

export interface SupabaseLeadRow {
  id: string;
  stage: Lead["stage"];
  personal: Lead["personal"];
  organization: Lead["organization"];
  extraction: Lead["extraction"];
  newsletter: Lead["newsletter"];
  pushed_to_instantly: boolean;
}

export function supabaseRowToLead(row: SupabaseLeadRow): Lead {
  return {
    id: row.id,
    personal: row.personal,
    organization: row.organization,
    extraction: row.extraction,
    newsletter: row.newsletter,
    stage: row.stage,
    pushedToInstantly: row.pushed_to_instantly,
  };
}
