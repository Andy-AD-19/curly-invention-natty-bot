import 'dotenv/config'
import { Telegraf, Markup, Scenes } from 'telegraf'
import http from 'http'
import { getUserState, saveUserState, clearUserState } from './services/db.service.js'
import { calculateTotals, generateInsights } from './services/report.service.js'
import { formatCyberMessage, escapeMarkdown, generateAsciiTable } from './utils/formatter.js'

const bot = new Telegraf(process.env.BOT_TOKEN)

const states = {
  IDLE: 'idle',
  AWAITING_PAGE: 'awaiting_page',
  AWAITING_FIELD: 'awaiting_field'
}

const fieldMapping = {
  '1': 'pageNo',
  '2': 'male',
  '3': 'female', 
  '4': 'totalPatients',
  '5': 'totalMedications',
  '6': 'stockOut',
  '7': 'antibiotics',
  '8': 'etb',
  '9': 'proff',
  '10': 'proffEtb'
}

const fieldLabels = {
  pageNo: 'Page No.',
  male: 'Male',
  female: 'Female',
  totalPatients: 'Total Patients',
  totalMedications: 'Total Meds',
  stockOut: 'Stock Out',
  antibiotics: 'Antibiotics',
  etb: 'ETB',
  proff: 'Proff',
  proffEtb: 'Proff+ETB'
}

async function getUserCtx(ctx) {
  const chatId = ctx.from.id.toString()
  const user = await getUserState(chatId)
  return user || { state: states.IDLE, pages: [] }
}

async function setUserCtx(ctx, data) {
  const chatId = ctx.from.id.toString()
  await saveUserState(chatId, data)
}

bot.start(async (ctx) => {
  await ctx.reply(formatCyberMessage('Welcome to ANDY AD. CORE\nPharmacy Reporting System'), {
    parse_mode: 'Markdown'
  })
  await setUserCtx(ctx, { state: states.IDLE, pages: [] })
})

bot.command('help', async (ctx) => {
  const helpText = `
/start - Start bot
/report - Enter pharmacy data
/stats - View current stats
/new - Clear and start new report
/clear - Cancel current report
`
  await ctx.reply(formatCyberMessage(helpText), { parse_mode: 'Markdown' })
})

bot.command('report', async (ctx) => {
  const user = await getUserCtx(ctx)
  if (user.pages.length > 0) {
    await ctx.reply(formatCyberMessage('Report in progress. Use /new to start fresh or continue entering data.'), {
      parse_mode: 'Markdown'
    })
    return
  }
  await setUserCtx(ctx, { state: states.AWAITING_PAGE, pages: [] })
  const menu = Markup.inlineKeyboard([
    [Markup.button.callback('Add Page 1', 'add_page')]
  ])
  await ctx.reply(formatCyberMessage('Starting new pharmacy report.\nClick to add first page data:'), {
    parse_mode: 'Markdown',
    ...menu
  })
})

bot.command('stats', async (ctx) => {
  const user = await getUserCtx(ctx)
  if (!user.pages || user.pages.length === 0) {
    await ctx.reply(formatCyberMessage('No data yet. Use /report to start.'), { parse_mode: 'Markdown' })
    return
  }

  const pageCount = user.pages.length
  const totals = calculateTotals(user.pages)
  const insights = generateInsights(totals, pageCount)

  const tableData = [
    { label: 'Pages', value: pageCount },
    { label: 'Male', value: totals.male },
    { label: 'Female', value: totals.female },
    { label: 'Total Pts', value: totals.totalPatients },
    { label: 'Meds', value: totals.totalMedications },
    { label: 'Stock Out', value: totals.stockOut },
    { label: 'Antibiotics', value: totals.antibiotics },
    { label: 'Proff', value: totals.proff },
    { label: 'Proff ETB', value: totals.proffEtb },
    { label: 'Birr', value: insights.totalRevenue }
  ]

  await ctx.reply(formatCyberMessage(generateAsciiTable(tableData)), {
    parse_mode: 'Markdown'
  })
  await ctx.reply(`_Insights: ${insights.malePct}% male, ${insights.femalePct}% female, $${insights.avgRevPerPt} avg per pt_`, {
    parse_mode: 'Markdown'
  })
})

bot.command('new', async (ctx) => {
  await setUserCtx(ctx, { state: states.IDLE, pages: [] })
  await ctx.reply(formatCyberMessage('Report cleared. Use /report to start fresh.'), {
    parse_mode: 'Markdown'
  })
})

bot.command('clear', async (ctx) => {
  const chatId = ctx.from.id.toString()
  await clearUserState(chatId)
  await ctx.reply(formatCyberMessage('Cancelled. Use /report to start over.'), {
    parse_mode: 'Markdown'
  })
})

bot.action('add_page', async (ctx) => {
  const user = await getUserCtx(ctx)
  await setUserCtx(ctx, { ...user, state: states.AWAITING_FIELD })
  
  const fieldList = Object.entries(fieldLabels).map(([key, label]) => `${key}) ${label}`).join('\n')
  
  await ctx.reply(formatCyberMessage('Enter page data (one value per line, in order):\n\n' + fieldList), {
    parse_mode: 'Markdown'
  })
  ctx.answerCbQuery()
})

bot.on('text', async (ctx) => {
  const user = await getUserCtx(ctx)
  
  if (user.state !== states.AWAITING_FIELD) return
  
  const text = ctx.message.text
  const values = text.split('\n').map(s => s.trim()).filter(s => s)
  
  if (values.length < 10) {
    await ctx.reply(formatCyberMessage('Need 10 values. Please enter all fields.'), {
      parse_mode: 'Markdown'
    })
    return
  }
  
  const page = {}
  let valid = true
  for (let i = 0; i < 10; i++) {
    const field = fieldMapping[(i + 1).toString()]
    const val = values[i]
    if (!val || isNaN(Number(val))) {
      valid = false
      break
    }
    page[field] = Number(val)
  }
  
  if (!valid) {
    await ctx.reply(formatCyberMessage('Invalid numbers. Please try again with numeric values only.'), {
      parse_mode: 'Markdown'
    })
    return
  }
  
  const newPages = [...user.pages, page]
  await setUserCtx(ctx, { state: states.AWAITING_PAGE, pages: newPages })
  
  const menu = Markup.inlineKeyboard([
    [Markup.button.callback('Add Another Page', 'add_page')],
    [Markup.button.callback('Done', 'finish_report')]
  ])
  
  await ctx.reply(formatCyberMessage(`Page ${newPages.length} added!`), {
    parse_mode: 'Markdown',
    ...menu
  })
})

bot.action('finish_report', async (ctx) => {
  const user = await getUserCtx(ctx)
  await setUserCtx(ctx, { ...user, state: states.IDLE })
  
  const pageCount = user.pages.length
  const totals = calculateTotals(user.pages)
  const insights = generateInsights(totals, pageCount)
  
  const tableData = [
    { label: 'Pages', value: pageCount },
    { label: 'Male', value: totals.male },
    { label: 'Female', value: totals.female },
    { label: 'Total Pts', value: totals.totalPatients },
    { label: 'Meds', value: totals.totalMedications },
    { label: 'Stock Out', value: totals.stockOut },
    { label: 'Antibiotics', value: totals.antibiotics },
    { label: 'Proff', value: totals.proff },
    { label: 'Proff ETB', value: totals.proffEtb },
    { label: 'Birr', value: insights.totalRevenue }
  ]

  await ctx.reply(formatCyberMessage('Report Complete!\n\n' + generateAsciiTable(tableData)), {
    parse_mode: 'Markdown'
  })
  ctx.answerCbQuery()
})

bot.launch()

const PORT = process.env.PORT || 3000
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.write('ANDY AD. CORE running...')
  res.end()
})

server.listen(PORT, () => {
  console.log(`Keep-alive server on port ${PORT}`)
})

console.log('ANDY AD. CORE bot started...')