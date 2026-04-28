export const formatCyberMessage = (text) => {
	return `⚡ *ANDY AD. CORE* 🧪\n\n${text}\n\n_NEON PROTOCOL ACTIVE_`
}

export const escapeMarkdown = (text) => {
	if (typeof text !== 'string') return text
	return text.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&')
}

export const generateAsciiTable = (data) => {
	// Simple ASCII table for Telegram monospaced view
	let table = '```\n'
	table += 'Category       | Value\n'
	table += '---------------|-------\n'
	data.forEach((row) => {
		const label = row.label.padEnd(14)
		const val = String(row.value).padStart(6)
		table += `${label} | ${val}\n`
	})
	table += '```'
	return table
}
