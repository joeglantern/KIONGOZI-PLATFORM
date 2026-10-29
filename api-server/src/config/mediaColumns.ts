// post_media.alt_text (photo descriptions) is added by a migration. Until it exists, queries
// must not ask for it, so we check once at boot and every 10 minutes, then include it.
import { prisma } from './prisma';

let hasAlt = false;

async function detect() {
  try {
    const rows: any[] = await prisma.$queryRaw`
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'post_media' and column_name = 'alt_text'`;
    hasAlt = rows.length > 0;
  } catch {
    // keep the last answer
  }
}

detect();
setInterval(detect, 10 * 60 * 1000).unref();

/** ", alt_text" when the column exists, else "" (append after the last post_media column) */
export const mediaAlt = () => (hasAlt ? ', alt_text' : '');
