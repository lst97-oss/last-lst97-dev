import { useForm } from '@tanstack/react-form'
import { cn } from 'cn'
import { type ChangeEvent, useMemo } from 'react'
import type { ChatContactFieldErrors } from '@/components/site/chat/chat-types'
import { formErrorClass, pixelButtonVariants } from '@/components/site/os-ui'
import { TurnstileChallenge } from '@/components/site/turnstile-challenge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type {
  ChatContactChoiceField,
  ChatContactField,
  ChatContactFieldValues,
  ChatContactTemplate,
} from '@/lib/chat-contact'
import {
  CHAT_CONTACT_EMPTY_CHOICE,
  CHAT_CONTACT_TEMPLATES,
  createChatContactDraftSchema,
  createChatContactFieldSchema,
  isChatContactChoiceField,
  parseChatContactChoices,
  serializeChatContactChoices,
} from '@/lib/chat-contact'
import { TURNSTILE_ACTIONS } from '@/lib/turnstile'

interface ChatContactFormPhaseProps {
  template: ChatContactTemplate
  initialValues: ChatContactFieldValues
  serverErrors: ChatContactFieldErrors
  pending: boolean
  canSubmit: boolean
  siteKey?: string | null
  turnstileToken: string | null
  turnstileResetCount: number
  onSetTurnstileToken: (token: string | null) => void
  onFieldChange: (field: ChatContactField) => void
  onSubmit: (fields: ChatContactFieldValues) => void
}

export function ChatContactFormPhase({
  template,
  initialValues,
  serverErrors,
  pending,
  canSubmit,
  siteKey,
  turnstileToken,
  turnstileResetCount,
  onSetTurnstileToken,
  onFieldChange,
  onSubmit,
}: ChatContactFormPhaseProps) {
  const configuration = CHAT_CONTACT_TEMPLATES[template]
  const schema = useMemo(() => createChatContactDraftSchema(template), [template])
  const fieldSchemas = useMemo(
    () =>
      Object.fromEntries(
        configuration.fields.map((field) => [field.key, createChatContactFieldSchema(template, field.key)]),
      ) as Partial<Record<ChatContactField, ReturnType<typeof createChatContactFieldSchema>>>,
    [configuration.fields, template],
  )
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
      <p className="form-note">
        Fill in the required fields. Examples show the kind of detail that helps Nelson understand your request.
      </p>
      <form.Subscribe selector={(state) => !state.isValid}>
        {(schemaInvalid) =>
          schemaInvalid || serverErrors.missingFields.length > 0 || serverErrors.invalidFields.length > 0 ? (
            <p className={cn(formErrorClass)} role="alert">
              Some fields need your attention. Correct the highlighted fields and submit again.
            </p>
          ) : null
        }
      </form.Subscribe>
      <div className="os-chat-contact-fields">
        {configuration.fields.map((field) => {
          const fieldId = `chat-contact-${field.key}`
          const serverError = serverErrors.missingFields.includes(field.key)
            ? 'This field is required.'
            : serverErrors.invalidFields.includes(field.key)
              ? field.key === 'email'
                ? 'Enter a valid email address.'
                : `Keep this field under ${field.maxLength} characters.`
              : undefined
          const exampleId = `${fieldId}-example`
          const errorId = `${fieldId}-error`

          return (
            <form.Field key={field.key} name={field.key} validators={{ onChange: fieldSchemas[field.key] }}>
              {(fieldApi) => {
                const localError = getChatContactFormError(fieldApi.state.meta.errors)
                const errorText = serverError ?? localError
                const value = fieldApi.state.value ?? ''
                // Only a textarea carries a visible limit. `field.maxLength` is
                // the same number `maxLength` below passes to the control and
                // `fieldSizeSchema` enforces server-side, so the three agree.
                const isMultiline = 'multiline' in field && field.multiline
                // A field that carries a defaultValue is a fixed part of the
                // request rather than something the visitor answers.
                const isFixedValue = 'defaultValue' in field
                const countId = `${fieldId}-count`
                const describedBy = [exampleId, isMultiline ? countId : undefined, errorText ? errorId : undefined]
                  .filter(Boolean)
                  .join(' ')
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

                if (isChatContactChoiceField(field)) {
                  return (
                    <div
                      className={
                        field.control === 'checkboxes'
                          ? 'os-chat-contact-field os-chat-contact-field--wide'
                          : 'os-chat-contact-field'
                      }
                    >
                      {/* The checkbox group names itself from this span: a
                          checkbox group has no single control to point a
                          <label htmlFor> at, so the field label carries the id
                          the group references. */}
                      <label htmlFor={field.control === 'select' ? fieldId : undefined}>
                        <span id={`${field.key}-label`}>
                          {field.label}
                          {field.required ? ' *' : ''}
                        </span>
                      </label>
                      {field.control === 'select' ? (
                        <ChatContactSelectField
                          describedBy={describedBy}
                          disabled={pending}
                          errorText={errorText}
                          field={field}
                          fieldId={fieldId}
                          onBlur={fieldApi.handleBlur}
                          onChange={(next) => {
                            fieldApi.handleChange(next)
                            onFieldChange(field.key)
                          }}
                          value={value}
                        />
                      ) : (
                        <ChatContactCheckboxField
                          describedBy={describedBy}
                          disabled={pending}
                          errorText={errorText}
                          field={field}
                          onBlur={fieldApi.handleBlur}
                          onChange={(next) => {
                            fieldApi.handleChange(next)
                            onFieldChange(field.key)
                          }}
                          value={value}
                        />
                      )}
                      <p className="os-chat-contact-example" id={exampleId}>
                        Example: {field.example}
                      </p>
                      {errorText ? (
                        <p className={cn(formErrorClass)} id={errorId} role="alert">
                          {errorText}
                        </p>
                      ) : null}
                    </div>
                  )
                }

                return (
                  <div className="os-chat-contact-field">
                    <label htmlFor={fieldId}>
                      <span>
                        {field.label}
                        {field.required ? ' *' : ''}
                      </span>
                      {isFixedValue ? (
                        // A field carrying a defaultValue is a constant, not a
                        // question: the support consultation is part of every
                        // engagement. Readonly rather than disabled, because a
                        // disabled control is skipped by the form and drops out
                        // of the submitted values the server then requires.
                        <input {...common} readOnly type="text" />
                      ) : isMultiline ? (
                        <textarea
                          {...common}
                          rows={field.key === 'stepsToReproduce' || field.key === 'message' ? 5 : 4}
                        />
                      ) : (
                        <input {...common} type={field.key === 'email' ? 'email' : 'text'} />
                      )}
                    </label>
                    {isMultiline ? (
                      <div className="os-chat-contact-hint">
                        <p className="os-chat-contact-example" id={exampleId}>
                          Example: {field.example}
                        </p>
                        <p className="os-chat-contact-count" id={countId}>
                          {value.length.toLocaleString('en-US')} / {field.maxLength.toLocaleString('en-US')}
                        </p>
                      </div>
                    ) : (
                      <p className="os-chat-contact-example" id={exampleId}>
                        Example: {field.example}
                      </p>
                    )}
                    {errorText ? (
                      <p className={cn(formErrorClass)} id={errorId} role="alert">
                        {errorText}
                      </p>
                    ) : null}
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
          {template === 'bug_report' ? (
            <p>
              Suspected security issues should be reported privately through the <a href="/contact">contact page</a>.
            </p>
          ) : null}
        </div>
      ) : null}
      {/*
       * Screening runs two model calls, so it carries its own challenge under a
       * separate action. The review phase keeps its own widget for the final
       * send, and Cloudflare binds each token to one action, so neither token
       * can stand in for the other.
       */}
      <div className="os-chat-contact-turnstile" role="group" aria-labelledby="chat-contact-screening-turnstile-label">
        <span className="turnstile-label sr-only" id="chat-contact-screening-turnstile-label">
          Security check before screening your request
        </span>
        {siteKey ? (
          <TurnstileChallenge
            action={TURNSTILE_ACTIONS.contactScreening}
            siteKey={siteKey}
            resetCount={turnstileResetCount}
            onToken={onSetTurnstileToken}
          />
        ) : (
          <p className="turnstile-unavailable" role="status">
            The security check is not configured yet.
          </p>
        )}
      </div>
      <div className="os-chat-contact-actions">
        <button
          className={cn(pixelButtonVariants({ tone: 'coral' }))}
          disabled={pending || !canSubmit || !siteKey || !turnstileToken}
          type="submit"
        >
          SCREEN AND REVIEW →
        </button>
      </div>
    </form>
  )
}

/**
 * A closed-set field rendered as a dropdown. Radix renders the trigger as a
 * `<button>`, so it gets its OS styling from `.os-chat-contact-select` in
 * chat.css rather than the wrapper's rounded-md defaults: every site rule is
 * unlayered and outranks a Tailwind utility passed as a className.
 */
function ChatContactSelectField({
  field,
  fieldId,
  value,
  errorText,
  describedBy,
  disabled,
  onChange,
  onBlur,
}: {
  field: ChatContactChoiceField
  fieldId: string
  value: string
  errorText: string | undefined
  describedBy: string
  disabled: boolean
  onChange: (value: string) => void
  onBlur: () => void
}) {
  return (
    <Select
      value={value}
      onValueChange={onChange}
      onOpenChange={(open) => {
        if (!open) onBlur()
      }}
      disabled={disabled}
    >
      <SelectTrigger
        aria-describedby={describedBy}
        aria-invalid={Boolean(errorText)}
        className="os-chat-contact-select"
        id={fieldId}
      >
        <SelectValue placeholder={field.required ? 'Choose one' : 'Choose one (optional)'} />
      </SelectTrigger>
      <SelectContent className="os-chat-contact-select-content">
        {field.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * A multi-choice field. Selections are stored as one comma-joined string in
 * the order the options are declared, so the value the operator reads in the
 * email and the PDF never depends on the order the visitor clicked.
 */
function ChatContactCheckboxField({
  field,
  value,
  errorText,
  describedBy,
  disabled,
  onChange,
  onBlur,
}: {
  field: ChatContactChoiceField
  value: string
  errorText: string | undefined
  describedBy: string
  disabled: boolean
  onChange: (value: string) => void
  onBlur: () => void
}) {
  const selected = new Set(parseChatContactChoices(field, value))

  return (
    <div
      aria-describedby={describedBy}
      // Without a label the group announces as a row of unlabelled checkboxes.
      // The field label is the group's name; each option keeps its own <label>.
      aria-labelledby={`${field.key}-label`}
      aria-invalid={Boolean(errorText)}
      className="os-chat-contact-choices"
      onBlur={onBlur}
      role="group"
    >
      {field.options.map((option, optionIndex) => {
        const optionId = `${field.key}-${optionIndex}`
        return (
          <div className="os-chat-contact-choice" key={option.value}>
            <Checkbox
              aria-describedby={optionId}
              checked={selected.has(option.value)}
              className="os-chat-contact-checkbox"
              disabled={disabled}
              id={optionId}
              onCheckedChange={(checked) => {
                if (checked) selected.add(option.value)
                else selected.delete(option.value)
                onChange(serializeChatContactChoices(field, selected))
              }}
            />
            <label htmlFor={optionId}>{option.label}</label>
          </div>
        )
      })}
      {value === CHAT_CONTACT_EMPTY_CHOICE || !value ? null : <span className="sr-only">{value}</span>}
    </div>
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
