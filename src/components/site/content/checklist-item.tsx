import { type ReactNode, useId } from 'react'

interface ChecklistItemProps {
  checked: boolean
  hasSubLists: boolean
  value?: number
  children: ReactNode
}

export function ChecklistItem({ checked, hasSubLists, value, children }: ChecklistItemProps) {
  const id = useId()

  return (
    <li
      className={`list-item-checkbox${checked ? ' list-item-checkbox-checked' : ' list-item-checkbox-unchecked'}${hasSubLists ? ' nestedListItem' : ''}`}
      style={{ listStyleType: 'none' }}
      value={value}
    >
      {hasSubLists ? (
        children
      ) : (
        <>
          <input checked={checked} id={id} readOnly type="checkbox" />
          <label htmlFor={id}>{children}</label>
          <br />
        </>
      )}
    </li>
  )
}
