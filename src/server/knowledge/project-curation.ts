import type { ProjectSoftwareKind } from './project-catalog'

export interface CuratedProjectClassification {
  kinds: ProjectSoftwareKind[]
  topics: string[]
}

const curation: Record<string, CuratedProjectClassification> = {
  'lst97/CantoCap': { kinds: ['desktop_app'], topics: ['cantonese', 'speech-to-text', 'subtitles'] },
  'lst97/QwenASR': { kinds: ['data_ml'], topics: ['speech-recognition', 'qwen', 'asr'] },
  'lst97/SIT-215-Fuzzy_Car_Project': { kinds: [], topics: ['coursework', 'fuzzy-logic', 'vehicle-simulation'] },
  'lst97/SIT210-Remote-Lock-Project': {
    kinds: ['other'],
    topics: ['coursework', 'embedded-systems', 'bluetooth-low-energy'],
  },
  'lst97/SIT215-KnightTour': { kinds: [], topics: ['coursework', 'algorithm', 'knight-tour'] },
  'lst97/SIT305_ITubeApp': { kinds: ['mobile_app'], topics: ['coursework', 'android', 'video'] },
  'lst97/SIT305_Lost_Found_App': { kinds: ['mobile_app'], topics: ['coursework', 'android', 'lost-and-found'] },
  'lst97/SIT305_News_App': { kinds: ['mobile_app'], topics: ['coursework', 'android', 'news'] },
  'lst97/SIT305_QuizeApp': { kinds: ['mobile_app'], topics: ['coursework', 'android', 'quiz'] },
  'lst97/SIT305_SharePreferences': { kinds: ['mobile_app'], topics: ['coursework', 'android', 'preferences'] },
  'lst97/SIT305_TruckApp': { kinds: ['mobile_app'], topics: ['coursework', 'android', 'trucking'] },
  'lst97/SIT305_UnitConvertor': { kinds: ['mobile_app'], topics: ['coursework', 'android', 'unit-conversion'] },
  'lst97/SIT305_timer': { kinds: ['mobile_app'], topics: ['coursework', 'android', 'timer'] },
  'lst97/SIT320-Project-MD5': { kinds: [], topics: ['coursework', 'SIT320', 'md5'] },
  'lst97/TPWFC-Fire-Documentary': { kinds: ['web_app'], topics: ['fire-documentary', 'media'] },
  'lst97/bin-time-crawler': { kinds: ['automation_devtool'], topics: ['web-crawler', 'australia', 'council-data'] },
  'lst97/canto-101-server': { kinds: ['api_backend'], topics: ['cantonese', 'language-learning'] },
  'lst97/canto-101-web': { kinds: ['web_app'], topics: ['cantonese', 'language-learning'] },
  'lst97/claude-code-sub-agents': {
    kinds: ['automation_devtool'],
    topics: ['ai-agents', 'claude-code', 'developer-tools'],
  },
  'lst97/e2ee-messaging-android-app-backend': {
    kinds: ['api_backend'],
    topics: ['end-to-end-encryption', 'messaging'],
  },
  'lst97/e2ee-messaging-android-app-frontend': {
    kinds: ['mobile_app'],
    topics: ['end-to-end-encryption', 'messaging', 'android'],
  },
  'lst97/github-readme-stats': {
    kinds: ['api_backend', 'web_app'],
    topics: ['github', 'statistics', 'developer-tools'],
  },
  'lst97/gnaf-autocomplete': { kinds: ['web_app'], topics: ['geospatial', 'address-search', 'australia'] },
  'lst97/info-hawker-server': { kinds: ['api_backend'], topics: ['hong-kong', 'food'] },
  'lst97/opencode-commands': { kinds: ['automation_devtool'], topics: ['opencode', 'developer-tools'] },
  'lst97/pixel-cast-backend': { kinds: ['api_backend'], topics: ['pixel-art', 'media'] },
  'lst97/pixel-cast-frontend': { kinds: ['web_app'], topics: ['pixel-art', 'media'] },
  'lst97/project-st-zita-backend': { kinds: ['api_backend'], topics: ['scheduling', 'management'] },
  'lst97/project-st-zita-frontend': { kinds: ['web_app'], topics: ['scheduling', 'management'] },
  'lst97/qwen3-tts-rs': { kinds: ['data_ml'], topics: ['text-to-speech', 'qwen', 'audio'] },
  'lst97/simple-cms-backend': { kinds: ['api_backend'], topics: ['cms'] },
  'lst97/simple-cms-frontend': { kinds: ['web_app'], topics: ['cms'] },
  'lst97/simple-kitchen-order': { kinds: ['web_app'], topics: ['food-service', 'ordering'] },
  'lst97/simple-receipt-manager-backend': { kinds: ['api_backend'], topics: ['receipt-management', 'flask'] },
  'lst97/simple-receipt-manager-frontend': { kinds: ['web_app'], topics: ['receipt-management'] },
  'lst97/simple-receipt-manager': { kinds: ['web_app', 'api_backend'], topics: ['receipt-management', 'coursework'] },
  'lst97/smartplay-hk-oss': { kinds: ['web_app'], topics: ['hong-kong', 'sports-facilities', 'open-data'] },
  'lst97/subagents.sh': { kinds: ['web_app', 'automation_devtool'], topics: ['ai-agents', 'developer-tools'] },
  'lst97/super-opencode': { kinds: ['automation_devtool'], topics: ['opencode', 'ai-agents', 'developer-tools'] },
  'lst97/toonconv': { kinds: ['cli_tool'], topics: ['toon', 'json', 'conversion'] },
  'lst97/typo-sync-server': {
    kinds: ['api_backend', 'automation_devtool'],
    topics: ['synchronization', 'developer-tools'],
  },
  'lst97/uptime-kuma': { kinds: ['web_app', 'infrastructure_devops'], topics: ['monitoring', 'uptime'] },
  'lst97/AntiRecoil': { kinds: [], topics: ['computer-vision', 'coursework'] },
  'lst97/Betty-Employment-Accounting': { kinds: ['desktop_app'], topics: ['accounting', 'employment'] },
  'lst97/FileStorageMicroService': { kinds: ['api_backend'], topics: ['file-storage', 'microservice'] },
  'lst97/SplitTab': { kinds: [], topics: ['expense-management', 'shared-expenses'] },
  'lst97/StoryForge': { kinds: ['web_app'], topics: ['storytelling', 'content-management'] },
  'lst97/TPWFC': { kinds: ['web_app'], topics: ['fire-documentary', 'media'] },
  'lst97/Thermal_Image_Pose_Analysis': {
    kinds: ['api_backend', 'data_ml'],
    topics: ['computer-vision', 'pose-analysis', 'thermal-imaging'],
  },
  'lst97/cantolyrics-server': { kinds: ['api_backend'], topics: ['cantonese', 'lyrics'] },
  'lst97/cantolyrics-web': { kinds: ['web_app'], topics: ['cantonese', 'lyrics'] },
  'lst97/cantolyrics_refactor': { kinds: ['web_app', 'api_backend'], topics: ['cantonese', 'lyrics'] },
  'lst97/lst97-strapi-cms': { kinds: ['api_backend'], topics: ['strapi', 'cms'] },
  'lst97/simple-speedometer': { kinds: ['mobile_app'], topics: ['swift', 'speedometer'] },
  'lst97/smarkplay-hk-oss-automation': {
    kinds: ['automation_devtool'],
    topics: ['hong-kong', 'open-data', 'automation'],
  },
  'lst97/split-tab-client': { kinds: ['web_app'], topics: ['expense-management', 'shared-expenses'] },
  'lst97/split-tab-server': { kinds: ['api_backend'], topics: ['expense-management', 'shared-expenses'] },
  'lst97/tpwfc-worker': { kinds: ['automation_devtool'], topics: ['fire-documentary', 'media-processing'] },
  'lst97/wwnz': { kinds: ['web_app'], topics: ['finance', 'expense-management'] },
  'lst97/yoons-cabinetry-store-back': { kinds: ['api_backend'], topics: ['e-commerce', 'cabinetry'] },
  'lst97/yoons-cabinetry-store-front': { kinds: ['web_app'], topics: ['e-commerce', 'cabinetry'] },
}

export function getCuratedProjectClassification(sourceId: string): CuratedProjectClassification {
  const entry = curation[sourceId]
  return entry ? { kinds: [...entry.kinds], topics: [...entry.topics] } : { kinds: [], topics: [] }
}
