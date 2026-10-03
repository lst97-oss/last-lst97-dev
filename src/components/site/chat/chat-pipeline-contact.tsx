import { Eyebrow } from '@/components/site/os-ui'
import { PixelIcon } from '@/components/site/pixel-icon'

/**
 * The separate contact workflow, described under the pipeline: what confirming
 * a contact offer changes, how each submission is screened, and what happens
 * on send. Static prose, so it carries no props.
 */
export function ChatPipelineContact() {
  return (
    <section className="chat-pipeline-contact" aria-labelledby="chat-pipeline-contact-title">
      <Eyebrow>
        <PixelIcon glyph="@" /> CONTACT / SEPARATE WORKFLOW
      </Eyebrow>
      <h3 id="chat-pipeline-contact-title">When you choose to contact Nelson</h3>
      <p className="chat-pipeline-contact-intro">
        Jev screens contact intent in normal chat. Only your confirmation starts the separate, context-cleared contact
        session.
      </p>
      <div className="chat-pipeline-contact-grid">
        <article className="chat-pipeline-contact-card" data-tone="teal">
          <p className="chat-pipeline-contact-kicker">START FRESH</p>
          <h4>Confirm the contact session</h4>
          <ul>
            <li>Nothing changes until you confirm. Keeping the conversation restores the same chat.</li>
            <li>Starting contact clears the earlier conversation. Those messages are not included in the request.</li>
            <li>
              Jev screens Email, Bug report, Feature request, Quotation, or Support plan and locks your choice.
              Switching requires a confirmed discard and restart.
            </li>
          </ul>
        </article>
        <article className="chat-pipeline-contact-card" data-tone="yellow">
          <p className="chat-pipeline-contact-kicker">COMPLETE AND REVIEW</p>
          <h4>Screen each request</h4>
          <ul>
            <li>
              Contact-specific Jev decisions screen every input. Server validation checks required fields, email syntax,
              and size limits. Unsafe, off-topic, uncertain, or incomplete input cannot advance.
            </li>
            <li>
              Email is sent as written. Bug, feature, quotation, and support plan requests get a meaning-preserving
              OpenRouter refinement without your name, reply address, or chat history. Review both versions and edit to
              screen again.
            </li>
          </ul>
        </article>
        <article className="chat-pipeline-contact-card" data-tone="coral">
          <p className="chat-pipeline-contact-kicker">SEND SAFELY</p>
          <h4>Confirm the reviewed version</h4>
          <ul>
            <li>
              Send Email rechecks the separate contact Turnstile token and applies chat and contact rate limits. A
              one-time Postgres claim must succeed before SMTP; a missing table, failed claim, or duplicate keeps the
              review open and prevents sending.
            </li>
            <li>
              Bug, feature, quotation, and support plan emails use refined fields and attach the original report PDF.
              The Email template is sent as written without a PDF. A receipt goes to your reply address; receipt failure
              does not undo owner delivery.
            </li>
            <li>After delivery, start a new blank chat to return to normal conversation.</li>
          </ul>
        </article>
      </div>
      <p className="chat-pipeline-contact-privacy" role="note">
        Contact text and form values stay out of application logs and Discord diagnostics. Diagnostics keep only request
        IDs, status and decision labels, and model metadata.
      </p>
    </section>
  )
}
