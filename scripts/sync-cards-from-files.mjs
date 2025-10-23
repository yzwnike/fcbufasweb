import mysql from 'mysql2/promise';
import { readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bufas_cards',
  port: parseInt(process.env.DB_PORT || '3306'),
  charset: 'utf8mb4',
};

const CARDS_ROOT = join(process.cwd(), 'public', 'cards');

const FOLDER_TO_SPECIAL = new Map([
  ['BASE', { special: 'Regular', defaultRarity: 'Silver' }],
  ['OG',   { special: 'OLD_GENERATION', defaultRarity: 'Silver' }],
  ['TOTW', { special: 'TEAM_OF_THE_WEEK', defaultRarity: 'Gold' }],
  ['NOMPOTM', { special: 'NOM_POTM', defaultRarity: 'Gold' }],
  ['POTM', { special: 'PLAYER_OF_THE_MONTH', defaultRarity: 'Legend' }],
  ['RR',   { special: 'RATING_RELOAD', defaultRarity: 'Elite' }],
  ['AE',   { special: 'ASSIST_ENGINE', defaultRarity: 'Elite' }],
  ['MM',   { special: 'MARKET_MASTER', defaultRarity: 'Elite' }],
  ['CH',   { special: 'COMEBACK_HERO', defaultRarity: 'Elite' }],
]);

function listPngs(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => extname(f).toLowerCase() === '.png')
      .map((f) => ({ name: f, full: join(dir, f) }));
  } catch {
    return [];
  }
}

function toTitleCase(s) {
  return s.replace(/(^|\s|[_-])(\p{L})/gu, (_, p1, p2) => `${p1 || ''}${p2.toUpperCase()}`)
          .replace(/[_-]/g, ' ');
}

function extractBaseFromFilename(file) {
  const noExt = file.replace(/\.png$/i, '');
  // remove known suffix tokens and trailing digits, case-insensitive
  const cleaned = noExt.replace(/(TOTW|NOMPOTM|POTM|RR|AE|MM|CH|OG)[0-9]*$/i, '');
  return cleaned.toLowerCase();
}

async function ensureSchema(conn) {
  // Expand enum and add columns; ignore errors if already applied
  const alters = [
    "ALTER TABLE cards MODIFY special_type ENUM('Regular','PLAYER_OF_THE_MONTH','RATING_RELOAD','ASSIST_ENGINE','MARKET_MASTER','COMEBACK_HERO','TEAM_OF_THE_WEEK','OLD_GENERATION','NOM_POTM') NOT NULL DEFAULT 'Regular'",
    "ALTER TABLE cards ADD COLUMN image_path VARCHAR(255) NULL AFTER base_price",
    "ALTER TABLE players ADD COLUMN card_asset_basename VARCHAR(100) NULL AFTER image_url",
    "ALTER TABLE players ADD COLUMN eligible_for_quiz TINYINT(1) NOT NULL DEFAULT 1 AFTER card_asset_basename",
    "CREATE INDEX idx_image_path ON cards(image_path)",
    "CREATE UNIQUE INDEX idx_card_asset_basename ON players(card_asset_basename)"
  ];
  for (const sql of alters) {
    try { await conn.execute(sql); } catch { /* noop */ }
  }
}

async function getPlayerByBasename(conn, basenameKey) {
  const [rows] = await conn.execute("SELECT * FROM players WHERE card_asset_basename = ?", [basenameKey]);
  return (rows || [])[0] || null;
}

async function createPlayer(conn, name, basenameKey, team, eligible = 0) {
  const stats = { pace: 70, shooting: 70, passing: 70, defending: 70, physical: 70, fifa_rating: 75 };
  const [res] = await conn.execute(
    `INSERT INTO players (name, team, position1, position2, pace, shooting, passing, defending, physical, fifa_rating, market_value, fantasy_points, image_url, card_asset_basename, eligible_for_quiz)
     VALUES (?, ?, 'ST', NULL, ?, ?, ?, ?, ?, ?, 0, 0, NULL, ?, ?)`,
    [name, team, stats.pace, stats.shooting, stats.passing, stats.defending, stats.physical, stats.fifa_rating, basenameKey, eligible]
  );
  return res.insertId;
}

async function ensureCard(conn, playerId, special, rarity, imagePath) {
  // Cada imagen es una carta única: usar image_path como clave de idempotencia
  const [rows] = await conn.execute('SELECT id FROM cards WHERE image_path = ? LIMIT 1', [imagePath]);
  if ((rows || []).length) {
    const id = rows[0].id;
    await conn.execute('UPDATE cards SET player_id = ?, rarity = ?, special_type = ? WHERE id = ?', [playerId, rarity, special, id]);
    return id;
  }
  const basePrice = rarity === 'Legend' ? 2000 : rarity === 'Elite' ? 1000 : rarity === 'Gold' ? 500 : rarity === 'Silver' ? 200 : 100;
  const [res] = await conn.execute(
    'INSERT INTO cards (player_id, rarity, special_type, special_month, base_price, image_path) VALUES (?, ?, ?, NULL, ?, ?)',
    [playerId, rarity, special, basePrice, imagePath]
  );
  return res.insertId;
}

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  try {
    console.log('🔄 Syncing cards from /public/cards ...');
    await ensureSchema(conn);

    const scannedPaths = new Set();

    for (const [folder, cfg] of FOLDER_TO_SPECIAL.entries()) {
      const dir = join(CARDS_ROOT, folder);
      const exists = (() => { try { return !!statSync(dir); } catch { return false; } })();
      if (!exists) continue;
      const files = listPngs(dir);
      for (const f of files) {
        const baseKey = folder === 'BASE' ? basename(f.name, '.png').toLowerCase() : extractBaseFromFilename(f.name);
        const imagePath = `/cards/${folder}/${f.name}`;
        scannedPaths.add(imagePath);

        let player = await getPlayerByBasename(conn, baseKey);
        if (!player) {
          const playerName = toTitleCase(baseKey);
          const team = folder === 'OG' ? 'FC Bufas OG' : 'FC Bufas';
          const eligible = folder === 'BASE' ? 1 : 0;
          const playerId = await createPlayer(conn, playerName, baseKey, team, eligible);
          player = { id: playerId };
          console.log(`➕ Player created: ${playerName} (${baseKey})`);
        }

        const cardId = await ensureCard(conn, player.id, cfg.special, cfg.defaultRarity, imagePath);
        console.log(`✅ Card ${folder}:${f.name} -> player_id=${player.id} card_id=${cardId}`);
      }
    }

    // Prune cards pointing to /cards/* not present anymore
    const [existing] = await conn.execute("SELECT id, image_path FROM cards WHERE image_path LIKE '/cards/%'");
    for (const row of existing || []) {
      if (row.image_path && !scannedPaths.has(row.image_path)) {
        await conn.execute('DELETE FROM cards WHERE id = ?', [row.id]);
        console.log(`🗑️  Removed missing card id=${row.id} (${row.image_path})`);
      }
    }

    console.log('🎉 Sync completed');
  } finally {
    await conn.end();
  }
}

// Ejecutar siempre (Windows puede no igualar import.meta.url y argv)
main().catch((e) => {
  console.error('❌ Sync failed:', e);
  process.exit(1);
});
