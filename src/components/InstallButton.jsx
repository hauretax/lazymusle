import { useEffect, useState } from 'react'

function isStandalone() {
  return (
    (typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)) ||
    false
  )
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

// Bouton d'installation du PWA. Utilise l'événement beforeinstallprompt quand il
// est dispo (Android/desktop Chrome). Sur iOS Safari (pas de prompt) et en repli,
// affiche les instructions. Se masque si l'app est déjà installée.
export default function InstallButton() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(isStandalone())
  const [hint, setHint] = useState(false)

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  const click = async () => {
    if (deferred) {
      deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferred(null)
    } else {
      setHint((v) => !v)
    }
  }

  return (
    <div className="install">
      <button className="btn btn--ghost install__btn" onClick={click}>
        📥 Installer l’app
      </button>
      {hint && !deferred && (
        <p className="install__hint">
          {isIOS() ? (
            <>Sur iPhone : appuie sur <b>Partager</b> (carré + flèche) puis <b>« Sur l’écran d’accueil »</b>.</>
          ) : (
            <>Ouvre le <b>menu de ton navigateur</b> puis <b>« Installer l’application »</b>.</>
          )}
        </p>
      )}
    </div>
  )
}
