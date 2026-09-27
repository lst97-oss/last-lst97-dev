export type PayloadLayoutData = Record<string, unknown> & {
  children?: unknown
  clientConfig?: unknown
}

export function toRootProviderProps(data: PayloadLayoutData): Record<string, unknown> {
  const { children: _ignored, clientConfig, ...layoutData } = data
  void _ignored

  return {
    ...layoutData,
    config: clientConfig,
  }
}
