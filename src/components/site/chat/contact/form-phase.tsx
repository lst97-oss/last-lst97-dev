import { useForm } from '@tanstack/react-form'
import { cn } from 'cn'
import { type ChangeEvent, useMemo } from 'react'
import type { ChatContactFieldErrors } from '@/components/site/chat/chat-types'
import { formErrorClass, pixelButtonVariants } from '@/components/site/os-ui'
import type { ChatContactField, ChatContactFieldValues, ChatContactTemplate } from '@/lib/chat-contact'
import { CHAT_CONTACT_TEMPLATES, createChatContactDraftSchema, createChatContactFieldSchema } from '@/lib/chat-contact'

interface ChatContactFormPhaseProps {
  template: ChatContactTemplate
  initialValues: ChatContactFieldValues
  serverErrors: ChatContactFieldErrors
  pending: boolean
  canSubmit: boolean
  onFieldChange: (field: ChatContactField) => void
  onSubmit: (fields: ChatContactFieldValues) => void
}

export function ChatContactFormPhase({
  template,
  initialValues,
  serverErrors,
  pending,
  canSubmit,
  onFieldChange,
  onSubmit,
}: ChatContactFormPhaseProps) {
  const configuration = CHAT_CONTACT_TEMPLATES[template]
  const schema = useMemo(() => createChatContactDraftSchema(template), [template])
  const fieldSchemas = useMemo(() => Object.fromEntries(configuration.fields.map((field) => [
    field.key,
    createChatContactFieldSchema(template, field.key),
  ])) as Partial<Record<ChatContactField, ReturnType<typeof createChatContactFieldSchema>>>, [configuration.fields, template])
  const form = useForm({
    defaultValues: initialValues,
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => onSubmit(value),
  })

  return (
    <form
      className="os-chat-contact-card os-chat-contact-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <p className="form-note">Fill in the required fields. Examples show the kind of detail that helps Nelson understand your request.</p>
      <form.Subscribe selector={(state) => !state.isValid}>
        {(schemaInvalid) => schemaInvalid || serverErrors.missingFields.length > 0 || serverErrors.invalidFields.length > 0
          ? <p className={cn(formErrorClass)} role="alert">Some fields need your attention. Correct the highlighted fields and submit again.</p>
          : null}
      </form.Subscribe>
      <div className="os-chat-contact-fields">
        {configuration.fields.map((field) => {
          const fieldId = `chat-contact-${field.key}`
          const serverError = serverErrors.missingFields.includes(field.key)
            ? 'This field is required.'
            : serverErrors.invalidFields.includes(field.key)
              ? field.key === 'email' ? 'Enter a valid email address.' : `Keep this field under ${field.maxLength} characters.`
              : undefined
          const exampleId = `${fieldId}-example`
          const errorId = `${fieldId}-error`

          return (
            <form.Field
              key={field.key}
              name={field.key}
              validators={{ onChange: fieldSchemas[field.key] }}
            >
              {(fieldApi) => {
                const localError = getChatContactFormError(fieldApi.state.meta.errors)
                const errorText = serverError ?? localError
                const describedBy = [exampleId, errorText ? errorId : undefined].filter(Boolean).join(' ')
                const value = fieldApi.state.value ?? ''
                const common = {
                  id: fieldId,
                  'aria-describedby': describedBy,
                  'aria-invalid': Boolean(errorText),
                  disabled: pending,
                  maxLength: field.maxLength,
                  onBlur: fieldApi.handleBlur,
                  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                    fieldApi.handleChange(event.target.value)
                    onFieldChange(field.key)
                  },
                  required: field.required,
                  value,
                }

                return (
                  <div className="os-chat-contact-field">
                    <label htmlFor={fieldId}>
                      <span>{field.label}{field.required ? ' *' : ''}</span>
                      {'multiline' in field && field.multiline ? (
                        <textarea
                          {...common}
                          rows={field.key === 'stepsToReproduce' || field.key === 'message' ? 5 : 4}
                        />
                      ) : (
                        <input
                          {...common}
                          type={field.key === 'email' ? 'email' : 'text'}
                        />
                      )}
                    </label>
                    <p className="os-chat-contact-example" id={exampleId}>Example: {field.example}</p>
                    {errorText ? <p className={cn(formErrorClass)} id={errorId} role="alert">{errorText}</p> : null}
                  </div>
                )
              }}
            </form.Field>
          )
        })}
      </div>
      {'notice' in configuration ? (
        <div className="os-chat-contact-notice" role="note">
          <p>{configuration.notice}</p>
          {template === 'bug_report' ? <p>Suspected security issues should be reported privately through the <a href="/contact">contact page</a>.</p> : null}
        </div>
      ) : null}
      <div className="os-chat-contact-actions">
        <button className={cn(pixelButtonVariants({ tone: 'coral' }))} disabled={pending || !canSubmit} type="submit">SCREEN AND REVIEW →</button>
      </div>
    </form>
  )
}

function getChatContactFormError(errors: unknown): string | undefined {
  const candidates = Array.isArray(errors) ? errors : [errors]
  for (const candidate of candidates) {
    if (typeof candidate === 'string') return candidate
    if (typeof candidate === 'object' && candidate !== null && 'message' in candidate) {
      const message = (candidate as { message?: unknown }).message
      if (typeof message === 'string') return message
    }
  }
  return undefined
}
