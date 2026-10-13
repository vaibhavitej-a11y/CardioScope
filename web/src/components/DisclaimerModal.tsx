import { useEffect, useRef } from 'react'
import { usePatientStore } from '../store/patientStore'
import { DISCLAIMER_TEXT } from './DisclaimerBanner'
import { Icon } from './Icon'

export function DisclaimerModal() {
  const dismissed = usePatientStore(s => s.disclaimerDismissed)
  const dismiss = usePatientStore(s => s.dismissDisclaimer)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    if (!dismissed) element?.showModal()
    return () => element?.close()
  }, [dismissed])
  if (dismissed) return null
  return <dialog ref={dialog} className="welcome-dialog" aria-labelledby="disclaimer-title" aria-describedby="disclaimer-description" onCancel={event => event.preventDefault()}>
    <div className="welcome-mark"><Icon name="pulse" size={30} /></div>
    <span className="eyebrow">WELCOME TO CARDIOSCOPE</span>
    <h2 id="disclaimer-title">A little context.<br />A clearer perspective.</h2>
    <p id="disclaimer-description">{DISCLAIMER_TEXT}</p>
    <div className="welcome-notice"><Icon name="shield" size={20} /><p>All values are research <strong>predictions</strong> based on a public dataset of 303 patients. The anatomical model is illustrative, not a patient scan or a map of individual lesions.</p></div>
    <button type="button" className="button button-primary" onClick={dismiss}>I understand — enter workspace <Icon name="arrow" size={17} /></button>
    <span className="welcome-footnote">Built for exploration. Designed for understanding.</span>
  </dialog>
}
