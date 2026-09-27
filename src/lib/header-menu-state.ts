export function updateOpenHeaderMenu(
  activeMenu: string | null,
  requestedMenu: string,
  isOpen: boolean,
): string | null {
  if (isOpen) return requestedMenu
  return activeMenu === requestedMenu ? null : activeMenu
}
