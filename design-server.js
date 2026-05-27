// design-server.js — tiny dev server that saves design changes to design-changes.json
// Run via: npm run dev:design
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT    = path.join(__dirname, 'design-changes.json')
const app       = express()

app.use(cors())
app.use(express.json())

// POST /save  — receives design state JSON, writes it to disk
app.post('/save', (req, res) => {
  const payload = JSON.stringify(req.body, null, 2)
  fs.writeFileSync(OUTPUT, payload)
  console.log('[design-server] Saved design-changes.json')
  res.json({ ok: true })
})

// GET /load — returns current saved state (for reloads)
app.get('/load', (req, res) => {
  if (fs.existsSync(OUTPUT)) {
    res.json(JSON.parse(fs.readFileSync(OUTPUT, 'utf-8')))
  } else {
    res.json(null)
  }
})

app.listen(3001, () => {
  console.log('[design-server] Listening on http://localhost:3001')
  console.log('[design-server] Changes saved to: design-changes.json')
})
