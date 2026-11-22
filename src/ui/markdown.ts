import DOMPurify from 'dompurify'
import { marked } from 'marked'

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName !== 'A') return
  node.setAttribute('target', '_blank')
  node.setAttribute('rel', 'noopener noreferrer')
})

export function renderMarkdown(text: string): string {
  const html = marked.parse(text, { async: false, gfm: true, breaks: true })
  return DOMPurify.sanitize(html, { FORBID_TAGS: ['img', 'style', 'form', 'input'], ALLOWED_URI_REGEXP: /^https?:/i })
}
