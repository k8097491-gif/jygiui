CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY,
  requester_id CHAR(36) NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(120) NOT NULL,
  impact VARCHAR(40) NOT NULL,
  urgency VARCHAR(24) NOT NULL,
  priority VARCHAR(16) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'New',
  group_name VARCHAR(120) NOT NULL DEFAULT 'Unassigned',
  assignee_id CHAR(36),
  due_at TIMESTAMPTZ NOT NULL,
  resolution TEXT,
  rating SMALLINT CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  rating_comment VARCHAR(280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  CHECK (impact IN ('One person','Several people','Teaching activity')),
  CHECK (urgency IN ('Low','Normal','Urgent')),
  CHECK (priority IN ('Low','Normal','High','Critical')),
  CHECK (status IN ('New','Assigned','In progress','Waiting','Escalated','Resolved','Closed','Reopened'))
);
CREATE INDEX IF NOT EXISTS tickets_requester_created ON tickets (requester_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tickets_assignee_status ON tickets (assignee_id, status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tickets_queue_due ON tickets (status, due_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tickets_category_created ON tickets (category, created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id CHAR(36) NOT NULL,
  body VARCHAR(800) NOT NULL,
  visibility VARCHAR(16) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','internal')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_ticket_created ON comments (ticket_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  kind VARCHAR(40) NOT NULL,
  title VARCHAR(120) NOT NULL,
  body VARCHAR(280) NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread ON notifications (user_id) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS event_outbox (
  id UUID PRIMARY KEY,
  aggregate_id UUID NOT NULL,
  actor_id CHAR(36) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error VARCHAR(500)
);
CREATE INDEX IF NOT EXISTS event_outbox_pending ON event_outbox (occurred_at) WHERE published_at IS NULL;

CREATE TABLE IF NOT EXISTS service_categories (
  name VARCHAR(120) PRIMARY KEY,
  group_name VARCHAR(120) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_articles (
  slug VARCHAR(80) PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  category VARCHAR(120) NOT NULL,
  summary VARCHAR(320) NOT NULL,
  steps JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS knowledge_articles_category ON knowledge_articles (category, title);
