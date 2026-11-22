// Opened by the side panel (src/ui/voice.ts) the first time voice is used: a side panel cannot show
// Chrome's microphone prompt, a tab can. The permission then holds for the whole extension.
const status = document.getElementById('status')

navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => {
    stream.getTracks().forEach((track) => track.stop())
    status.className = 'ok'
    status.textContent = 'Listo. Vuelve al panel del asistente y pulsa otra vez el botón de voz. Esta pestaña se cerrará sola.'
    setTimeout(() => chrome.tabs.getCurrent((tab) => tab?.id && chrome.tabs.remove(tab.id)), 2500)
  })
  .catch(() => {
    status.className = 'error'
    status.textContent =
      'El micrófono está bloqueado. Pulsa el icono del candado o de ajustes en la barra de direcciones, permite el micrófono y recarga esta página.'
  })
