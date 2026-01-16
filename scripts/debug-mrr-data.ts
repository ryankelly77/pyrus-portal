import 'dotenv/config'

async function debug() {
  const res = await fetch('http://localhost:3000/api/admin/dashboard/mrr')
  const data = await res.json()

  console.log('Chart Data (last 6 months):')
  const recent = data.chartData?.slice(-6) || []
  recent.forEach((m: any) => {
    console.log('  ' + m.label + ' (' + m.month + '): $' + m.mrr)
  })

  console.log('\nChanges:')
  for (let i = 1; i < recent.length; i++) {
    const change = recent[i].mrr - recent[i-1].mrr
    console.log('  ' + recent[i].label + ': ' + (change >= 0 ? '+' : '') + '$' + change)
  }
}

debug().catch(console.error)
