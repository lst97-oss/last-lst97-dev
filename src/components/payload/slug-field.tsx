'use client'

import { TextField, useField, useFormFields } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { useEffect, useState } from 'react'
import { automaticSlugForTitle } from '@/lib/content/automatic-slug'

export const SlugField: TextFieldClientComponent = (props) => {
  const titlePath = props.path.replace(/\.slug$/, '.title')
  const title = useFormFields(([fields]) => fields[titlePath]?.value)
  const slug = useField<string>({ path: props.path })
  const [previousAutomaticSlug, setPreviousAutomaticSlug] = useState<string>()
  const suggestedSlug = automaticSlugForTitle({
    title,
    currentSlug: slug.value,
    previousAutomaticSlug,
  })

  useEffect(() => {
    if (!suggestedSlug) return

    slug.setValue(suggestedSlug)
    setPreviousAutomaticSlug(suggestedSlug)
  }, [slug.setValue, suggestedSlug])

  return <TextField {...props} />
}
