export function ChatContactDeliveredPhase({
  pending,
  hasContextToken,
  onStartBlankChat,
}: {
  pending: boolean
  hasContextToken: boolean
  onStartBlankChat: () => void
}) {
  return (
    <div className="os-chat-contact-card">
      <p>The contact session is complete. It will stay in contact mode until you start a new blank chat or discard it.</p>
      <button className="pixel-button primary" disabled={pending || !hasContextToken} onClick={onStartBlankChat} type="button">START NEW BLANK CHAT</button>
    </div>
  )
}

export function ChatContactDiscardActions({
  pending,
  hasContextToken,
  discardConfirmation,
  onDiscard,
  onSetDiscardConfirmation,
}: {
  pending: boolean
  hasContextToken: boolean
  discardConfirmation: boolean
  onDiscard: () => void
  onSetDiscardConfirmation: (confirmed: boolean) => void
}) {
  return (
    <div className="os-chat-contact-discard">
      {discardConfirmation ? <p role="alert">This clears the whole contact request and starts a blank chat. This cannot be undone.</p> : null}
      <div className="os-chat-contact-actions">
        {discardConfirmation ? <button className="pixel-button" disabled={pending} onClick={() => onSetDiscardConfirmation(false)} type="button">KEEP THIS REQUEST</button> : null}
        <button className={discardConfirmation ? 'pixel-button danger' : 'pixel-button'} disabled={pending || !hasContextToken} onClick={onDiscard} type="button">
          {discardConfirmation ? 'CONFIRM DISCARD' : 'DISCARD CONTACT REQUEST'}
        </button>
      </div>
    </div>
  )
}
