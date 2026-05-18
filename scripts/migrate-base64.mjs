import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'

const ENV_FILE = existsSync('.env') ? readFileSync('.env', 'utf-8') : ''
const env = Object.fromEntries(
  ENV_FILE.split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split('=', 2).map(s => s.trim()))
)

const SUPABASE_URL = env.SUPABASE_URL || process.env.SUPABASE_URL || 'https://ihiuygpxoxttwmbwbpns.supabase.co'
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || ''

if (!SUPABASE_KEY) {
  console.error('Defina SUPABASE_SERVICE_KEY ou SUPABASE_KEY no .env ou variável de ambiente.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function base64ToBuffer(dataUri) {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') }
}

function extFromMime(mime) {
  const map = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }
  return map[mime] || 'png'
}

async function migrateCover(hq) {
  if (!hq.cover || !hq.cover.startsWith('data:')) return null
  const parsed = base64ToBuffer(hq.cover)
  if (!parsed) return null

  const ext = extFromMime(parsed.mime)
  const path = `${hq.id}/cover.${ext}`

  const { error } = await supabase.storage.from('hq-covers').upload(path, parsed.buffer, {
    contentType: parsed.mime,
    upsert: true
  })
  if (error) { console.error(`  Falha upload capa: ${error.message}`); return null }

  return supabase.storage.from('hq-covers').getPublicUrl(path).data.publicUrl
}

async function migrateChapterPages(hq) {
  const chapters = hq.chapters || []
  let modified = false

  for (let ci = 0; ci < chapters.length; ci++) {
    const pages = chapters[ci].pages || []
    for (let pi = 0; pi < pages.length; pi++) {
      const page = pages[pi]
      if (!page || !page.startsWith('data:')) continue

      const parsed = base64ToBuffer(page)
      if (!parsed) continue

      const ext = extFromMime(parsed.mime)
      const path = `${hq.id}/${ci}/${pi}.${ext}`

      const { error } = await supabase.storage.from('hq-pages').upload(path, parsed.buffer, {
        contentType: parsed.mime,
        upsert: true
      })
      if (error) { console.error(`  Falha upload página ${ci}/${pi}: ${error.message}`); continue }

      chapters[ci].pages[pi] = supabase.storage.from('hq-pages').getPublicUrl(path).data.publicUrl
      modified = true
    }
  }

  return modified ? chapters : null
}

async function main() {
  console.log('🔍 Lendo HQs do banco...')
  const { data: hqs, error } = await supabase.from('hqs').select('*')
  if (error) { console.error('Erro ao buscar HQs:', error.message); process.exit(1) }

  console.log(`📦 ${hqs.length} HQs encontradas\n`)

  for (const hq of hqs) {
    process.stdout.write(`📖 ${hq.name}... `)
    const updates = {}

    const coverUrl = await migrateCover(hq)
    if (coverUrl) {
      updates.cover = coverUrl
    }

    const chapters = await migrateChapterPages(hq)
    if (chapters) {
      updates.chapters = chapters
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase.from('hqs').update(updates).eq('id', hq.id)
      if (updateError) {
        console.log(`❌ ${updateError.message}`)
      } else {
        console.log(`✅ (capa: ${coverUrl ? 'sim' : 'não'}, páginas: ${chapters ? 'sim' : 'não'})`)
      }
    } else {
      console.log('⏭️  sem base64')
    }
  }

  console.log('\n🎉 Migração concluída!')
}

main().catch(err => { console.error(err); process.exit(1) })
