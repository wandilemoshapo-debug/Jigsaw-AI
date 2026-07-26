// lib/evaluation/verify.cjs
// Confirms a candidate URL actually belongs to the business before we trust it.

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(pty|ltd|cc|inc|the|and)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function nameMatchScore(businessName, pageText) {
  const nameWords = normalize(businessName).split(' ').filter(w => w.length > 2)
  if (nameWords.length === 0) return 0
  const normalizedPage = normalize(pageText)
  const matched = nameWords.filter(w => normalizedPage.includes(w))
  return matched.length / nameWords.length
}

async function verifyCandidate(page, url, lead) {
  const result = { url, verified: false, confidence: 0, reason: '' }
  try {
    const response = await page.goto(url, { timeout: 12000, waitUntil: 'domcontentloaded' })
    if (!response || !response.ok()) {
      result.reason = `page returned ${response ? response.status() : 'no response'}`
      return result
    }

    const title = await page.title()
    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 3000) || '')
    const combined = `${title} ${bodyText}`

    let score = nameMatchScore(lead.business_name, combined)

    // Bonus signal: phone number appearing on the page
    if (lead.phone) {
      const digitsOnly = lead.phone.replace(/\D/g, '').slice(-9)
      if (digitsOnly.length >= 7 && combined.replace(/\D/g, '').includes(digitsOnly)) {
        score = Math.min(1, score + 0.3)
      }
    }

    result.confidence = Math.round(score * 100) / 100
    result.verified = score >= 0.5
    result.reason = result.verified
      ? 'name/phone match found on page'
      : `low confidence match (${result.confidence})`
  } catch (e) {
    result.reason = `failed to load: ${e.message}`
  }
  return result
}

module.exports = { verifyCandidate, nameMatchScore, normalize }