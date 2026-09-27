import { TURNSTILE_ACTIONS } from '../../lib/turnstile'
import { createOpenRouterChatContactRefiner } from '../contact/chat/openrouter-refiner'
import { createChatContactWorkflow } from '../contact/chat/workflow'
import { submitChatContact } from '../contact/runtime'
import { createTurnstileVerifier } from '../contact/turnstile-verifier'
import type { TurnstileVerifier } from '../contact/types'
import { contentReader } from '../content/runtime'
import { getServerEnv, requiredServerEnv } from '../env'
import { getKnowledgeIndexRepository } from '../knowledge/database'
import { createEmbeddingClient } from '../knowledge/embedding-client'
import { createQueryEmbeddingConfig } from '../knowledge/embedding-provider-config'
import { createJevKnowledgeRelevanceGate } from '../knowledge/jev-relevance-gate'
import type { ProjectCatalogQuery } from '../knowledge/project-catalog'
import { createRetrieveKnowledge } from '../knowledge/retrieve'
import { createSiliconFlowReranker } from '../knowledge/siliconflow-reranker'
import { getModerationService } from '../moderation/runtime'
import type { ChatDiagnosticsSink } from '../observability/chat-diagnostics'
import { createDiscordDiagnosticsSink } from '../observability/chat-diagnostics'
import { logger } from '../observability/logger'
import { getCodingHistoryRepository } from '../wakatime/history/database'
import { createWakaTimeStatsClient } from '../wakatime/public-shares'
import { createAgentPlanner } from './agent/agent-planner'
import { createChatContextSigner } from './context-signer'
import { createOpenRouterResponder } from './openrouter-responder'
import type { ChatService } from './service'
import { createChatService } from './service'

let service: ChatService | undefined
let contactWorkflow: ReturnType<typeof createChatContactWorkflow> | undefined
let diagnosticsSink: ChatDiagnosticsSink | undefined
let diagnosticsSinkResolved = false
let chatTurnstileVerifier: TurnstileVerifier | undefined

export function verifyChatTurnstile(token: string, expectedHostname: string): Promise<boolean> {
  chatTurnstileVerifier ??= createTurnstileVerifier({
    secret: requiredServerEnv('TURNSTILE_SECRET_KEY'),
    action: TURNSTILE_ACTIONS.chatMessage,
  })
  return chatTurnstileVerifier.verify(token, expectedHostname)
}

function getChatDiagnosticsSink(): ChatDiagnosticsSink | undefined {
  if (diagnosticsSinkResolved) return diagnosticsSink
  diagnosticsSinkResolved = true
  const webhookUrl = getServerEnv().CHAT_OBSERVABILITY_DISCORD_WEBHOOK_URL
  if (webhookUrl) diagnosticsSink = createDiscordDiagnosticsSink({ webhookUrl, logger })
  return diagnosticsSink
}

export function getChatContactWorkflow() {
  if (!contactWorkflow) {
    contactWorkflow = createChatContactWorkflow({
      moderation: getModerationService(),
      contextSigner: createChatContextSigner(requiredServerEnv('CHAT_CONTEXT_SIGNING_SECRET')),
      refiner: createOpenRouterChatContactRefiner(),
      submitContact: submitChatContact,
      diagnosticsSink: getChatDiagnosticsSink(),
    })
  }
  return contactWorkflow
}

function createKnowledgeRetriever() {
  const env = getServerEnv()
  const repository = {
    search: (vector: number[], limit: number) => getKnowledgeIndexRepository().search(vector, limit),
    listOwnedProjects: (query: ProjectCatalogQuery) => getKnowledgeIndexRepository().listOwnedProjects(query),
  }
  return createRetrieveKnowledge({
    embedding: createEmbeddingClient(createQueryEmbeddingConfig(env, requiredServerEnv('SILICONFLOW_API_KEY'))),
    repository,
    reranker: createSiliconFlowReranker({
      apiKey: requiredServerEnv('SILICONFLOW_API_KEY'),
      timeoutMs: env.KNOWLEDGE_EMBEDDING_TIMEOUT_MS,
    }),
    relevanceGate: createJevKnowledgeRelevanceGate({ apiKey: requiredServerEnv('TYPESAFE_API_KEY') }),
    logger,
  })
}

export function getChatService(): ChatService {
  if (!service) {
    const env = getServerEnv()
    const knowledgeEnabled = env.KNOWLEDGE_RAG_ENABLED
    const historyDatabaseUrl = env.KNOWLEDGE_DATABASE_URL
    const chatDiagnosticsSink = getChatDiagnosticsSink()
    service = createChatService(createOpenRouterResponder(), {
      moderation: getModerationService(),
      contextSigner: createChatContextSigner(requiredServerEnv('CHAT_CONTEXT_SIGNING_SECRET')),
      ...(knowledgeEnabled ? { knowledge: createKnowledgeRetriever() } : {}),
      knowledgeEnabled,
      codingStats: createWakaTimeStatsClient({ logger }),
      codingStatsEnabled: true as const,
      ...(historyDatabaseUrl
        ? { codingHistory: getCodingHistoryRepository(), codingHistoryEnabled: true as const }
        : {}),
      siteContent: contentReader,
      planner: createAgentPlanner({ ...(env.OPENROUTER_PLANNER_MODEL ? { model: env.OPENROUTER_PLANNER_MODEL } : {}) }),
      ...(chatDiagnosticsSink ? { diagnosticsSink: chatDiagnosticsSink } : {}),
      logger,
    })
  }
  return service
}
