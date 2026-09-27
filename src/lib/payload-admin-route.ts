export function buildAdminRenderParams(segments: string[]): { segments?: string[] } {
  return segments.length === 0 ? {} : { segments }
}
