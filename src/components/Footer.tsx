import React from 'react'
import { useTranslation } from 'react-i18next'

const Footer = () => {
    const { t } = useTranslation()
    return (
        <footer className="w-full py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            <a
                href="https://jorgequintero.online/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
                {t('footer.developedBy')}
            </a>
        </footer>

    )
}

export default Footer