export interface ContactMessage {
  name: string
  email: string
  message: string
  website: string
}

export interface TurnstileVerifier {
  verify(token: string, expectedHostname: string): Promise<boolean>
}
