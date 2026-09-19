import fs from 'node:fs'

const backupPath = process.argv[2] || 'docs/Backup SQL Mar 17 2026 (1)'
const baseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SECRET_KEY

if (!baseUrl || !serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required')

const backup = fs.readFileSync(backupPath, 'utf8')
const tableOrder = [
    'plans', 'admin_config', 'user_profiles', 'events', 'challenges', 'photos',
    'moderation_queues', 'moderation_actions', 'jukebox_settings', 'jukebox_queue',
    'user_subscriptions', 'photo_reactions', 'event_recaps', 'live_messages'
]
const conflictKeys = { admin_config: 'key', jukebox_settings: 'event_id' }

function decodeCopyValue(value) {
    if (value === '\\N') return null
    return value.replace(/\\([\\t nr])/g, (_, escaped) => ({ '\\': '\\', t: '\t', ' ': ' ', n: '\n', r: '\r' }[escaped] || escaped))
}

function parseJson(value) {
    if (value === null || value === '') return value
    try { return JSON.parse(value) } catch { return value }
}

function parseTables() {
    const tables = new Map()
    const copyPattern = /^COPY public\.([a-z_]+) \(([^)]+)\) FROM stdin;$/gm
    let match
    while ((match = copyPattern.exec(backup))) {
        const [, table, columnText] = match
        if (!tableOrder.includes(table)) continue
        const start = copyPattern.lastIndex
        const end = backup.indexOf('\n\\.', start)
        if (end < 0) throw new Error(`COPY block not closed: ${table}`)
        const columns = columnText.split(',').map((column) => column.trim())
        const rows = backup.slice(start, end).trimEnd().split('\n').filter(Boolean).map((line) => {
            const values = line.split('\t').map(decodeCopyValue)
            return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? null]))
        })
        tables.set(table, rows)
        copyPattern.lastIndex = end + 3
    }
    return tables
}

function normalize(table, row) {
    const jsonColumns = new Set(['features', 'voters', 'ai_metadata', 'landing_config'])
    for (const column of jsonColumns) if (column in row) row[column] = parseJson(row[column])
    if (table === 'jukebox_settings' && row.vibe_filters === '{}') row.vibe_filters = []
    return row
}

async function importTable(table, rows) {
    if (!rows.length) return
    const conflict = conflictKeys[table] || 'id'
    const url = `${baseUrl}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`
    for (let index = 0; index < rows.length; index += 100) {
        const batch = rows.slice(index, index + 100).map((row) => normalize(table, { ...row }))
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                'Content-Type': 'application/json',
                Prefer: 'resolution=merge-duplicates,return=minimal'
            },
            body: JSON.stringify(batch)
        })
        if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`)
    }
    console.log(`${table}: ${rows.length} rows imported`)
}

const tables = parseTables()
for (const table of tableOrder) await importTable(table, tables.get(table) || [])