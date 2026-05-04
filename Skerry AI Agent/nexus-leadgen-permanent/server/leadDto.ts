/**
 * Maps DB rows / inserts to the wire format expected by the React lead store.
 * Dependencies: @shared/database.types. Env: N/A.
 */

import type { LeadInsert, LeadRow } from "../shared/database.types.js";

/** Wire shape mirrors client `Lead` (stable JSON for the UI). */
export interface LeadWire {
  id: string;
  personal: {
    firstName: string;
    lastName: string;
    email?: string;
    title: string;
    linkedin: string;
  };
  organization: { name: string; website: string };
  extraction: {
    websiteContext: string;
    personContext: string;
    uniqueAngles: string[];
  };
  newsletter: { title: string; subheading: string; body: string };
  stage: LeadRow["stage"];
  pushedToInstantly: boolean;
}

export function leadRowToWire(row: LeadRow): LeadWire {
  return {
    id: row.id,
    personal: row.personal as LeadWire["personal"],
    organization: row.organization as LeadWire["organization"],
    extraction: row.extraction as LeadWire["extraction"],
    newsletter: row.newsletter as LeadWire["newsletter"],
    stage: row.stage,
    pushedToInstantly: row.pushed_to_instantly,
  };
}

export function leadInsertToWire(id: string, ins: LeadInsert): LeadWire {
  return {
    id,
    personal: ins.personal as LeadWire["personal"],
    organization: ins.organization as LeadWire["organization"],
    extraction: ins.extraction as LeadWire["extraction"],
    newsletter: ins.newsletter as LeadWire["newsletter"],
    stage: ins.stage,
    pushedToInstantly: ins.pushed_to_instantly,
  };
}
