import * as migration_20260921_083014 from './20260921_083014';
import * as migration_20260921_120832_add_portfolio_content from './20260921_120832_add_portfolio_content';
import * as migration_20260922_092648 from './20260922_092648';
import * as migration_20260922_115650_add_media_storage_prefix from './20260922_115650_add_media_storage_prefix';
import * as migration_20260923_010000_add_public_rate_limits from './20260923_010000_add_public_rate_limits';
import * as migration_20260926_010000_add_chat_contact_approvals from './20260926_010000_add_chat_contact_approvals';
import * as migration_20260927_032011_add_changelogs from './20260927_032011_add_changelogs';

export const migrations = [
  {
    up: migration_20260921_083014.up,
    down: migration_20260921_083014.down,
    name: '20260921_083014',
  },
  {
    up: migration_20260921_120832_add_portfolio_content.up,
    down: migration_20260921_120832_add_portfolio_content.down,
    name: '20260921_120832_add_portfolio_content',
  },
  {
    up: migration_20260922_092648.up,
    down: migration_20260922_092648.down,
    name: '20260922_092648',
  },
  {
    up: migration_20260922_115650_add_media_storage_prefix.up,
    down: migration_20260922_115650_add_media_storage_prefix.down,
    name: '20260922_115650_add_media_storage_prefix',
  },
  {
    up: migration_20260923_010000_add_public_rate_limits.up,
    down: migration_20260923_010000_add_public_rate_limits.down,
    name: '20260923_010000_add_public_rate_limits',
  },
  {
    up: migration_20260926_010000_add_chat_contact_approvals.up,
    down: migration_20260926_010000_add_chat_contact_approvals.down,
    name: '20260926_010000_add_chat_contact_approvals',
  },
  {
    up: migration_20260927_032011_add_changelogs.up,
    down: migration_20260927_032011_add_changelogs.down,
    name: '20260927_032011_add_changelogs'
  },
];
