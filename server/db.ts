import { Pool, type PoolClient } from "pg";

type AccountTier = "solo" | "team" | "agency";

export interface UsageSnapshot {
  runsUsed: number;
}

interface DbConfig {
  databaseUrl: string | undefined;
}

function poolSsl(): false | { rejectUnauthorized: boolean } {
  if (process.env.NODE_ENV !== "production") return false;
  return {
    rejectUnauthorized:
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
  };
}

export class EntitlementDb {
  private readonly pool: Pool | null;

  constructor(config: DbConfig) {
    this.pool = config.databaseUrl
      ? new Pool({
          connectionString: config.databaseUrl,
          ssl: poolSsl(),
        })
      : null;
  }

  get isConfigured(): boolean {
    return this.pool !== null;
  }

  /** Throws if pool is missing or `select 1` fails. */
  async ping(): Promise<void> {
    if (!this.pool) throw new Error("database not configured");
    await this.pool.query("select 1 as ok");
  }

  async init(): Promise<void> {
    if (!this.pool) return;
    await this.pool.query(`
      create table if not exists entitlement_usage (
        email text not null,
        usage_month text not null,
        tier text not null,
        runs_used integer not null default 0,
        updated_at timestamptz not null default now(),
        primary key (email, usage_month)
      )
    `);
  }

  async getUsage(email: string, usageMonth: string): Promise<UsageSnapshot> {
    if (!this.pool) return { runsUsed: 0 };
    const result = await this.pool.query<{ runs_used: number }>(
      `
        select runs_used
        from entitlement_usage
        where email = $1 and usage_month = $2
      `,
      [email, usageMonth]
    );
    const runsUsed = result.rows[0]?.runs_used ?? 0;
    return { runsUsed: Math.max(0, runsUsed) };
  }

  async consumeRun(params: {
    email: string;
    tier: AccountTier;
    usageMonth: string;
    monthlyRunsLimit: number;
  }): Promise<{ allowed: boolean; runsUsed: number }> {
    if (!this.pool) return { allowed: false, runsUsed: 0 };
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const current = await this.ensureRowForUpdate(
        client,
        params.email,
        params.tier,
        params.usageMonth
      );
      if (current >= params.monthlyRunsLimit) {
        await client.query("rollback");
        return { allowed: false, runsUsed: current };
      }
      const next = current + 1;
      await client.query(
        `
          update entitlement_usage
          set runs_used = $4, tier = $3, updated_at = now()
          where email = $1 and usage_month = $2
        `,
        [params.email, params.usageMonth, params.tier, next]
      );
      await client.query("commit");
      return { allowed: true, runsUsed: next };
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  private async ensureRowForUpdate(
    client: PoolClient,
    email: string,
    tier: AccountTier,
    usageMonth: string
  ): Promise<number> {
    const existing = await client.query<{ runs_used: number }>(
      `
        select runs_used
        from entitlement_usage
        where email = $1 and usage_month = $2
        for update
      `,
      [email, usageMonth]
    );
    if (existing.rows[0]) {
      return Math.max(0, existing.rows[0].runs_used);
    }

    await client.query(
      `
        insert into entitlement_usage (email, usage_month, tier, runs_used)
        values ($1, $2, $3, 0)
        on conflict (email, usage_month) do nothing
      `,
      [email, usageMonth, tier]
    );

    const afterInsert = await client.query<{ runs_used: number }>(
      `
        select runs_used
        from entitlement_usage
        where email = $1 and usage_month = $2
        for update
      `,
      [email, usageMonth]
    );
    return Math.max(0, afterInsert.rows[0]?.runs_used ?? 0);
  }
}
