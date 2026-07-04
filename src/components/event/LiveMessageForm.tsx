import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, User } from 'lucide-react'
import { useLiveMessages } from '../../hooks/useLiveMessages'

interface LiveMessageFormProps {
  eventId: string
}

export default function LiveMessageForm({ eventId }: LiveMessageFormProps) {
  const { t } = useTranslation()
  const { sendMessage } = useLiveMessages(eventId)
  const [authorName, setAuthorName] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setIsSending(true)
    try {
      await sendMessage(authorName || 'Anónimo', message)
      setMessage('')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-shrink-0">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder={t('livewall.name', 'Tu nombre')}
          className="w-full sm:w-32 pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 sm:rounded-l-lg rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
        />
      </div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t('livewall.placeholder', 'Escribe un mensaje...')}
        className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
        required
      />
      <button
        type="submit"
        disabled={isSending || !message.trim()}
        className="px-4 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 min-h-[44px]"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  )
}
