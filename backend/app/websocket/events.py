# All event types emitted from REST routers → broadcast to WS rooms

# Tasks
TASK_CREATED = "task.created"
TASK_STATUS_CHANGED = "task.status_changed"
TASK_REASSIGNED = "task.reassigned"
TASK_LOCKED = "task.locked"
TASK_DEADLINE_EXCEEDED = "task.deadline_exceeded"
TASK_DELETED = "task.deleted"

# Chat
CHAT_NEW_MESSAGE = "chat.new_message"

# Projects
PROJECT_CREATED = "project.created"
PROJECT_UPDATED = "project.updated"

# Teams
TEAM_CREATED = "team.created"
TEAM_MEMBER_ADDED = "team.member_added"
TEAM_MEMBER_REMOVED = "team.member_removed"
TEAM_LEAD_ASSIGNED = "team.lead_assigned"

# Reviews
REVIEW_SUBMITTED = "review.submitted"

# Notifications
NOTIFICATION_NEW = "notification.new"

# Analytics
ANALYTICS_REFRESH = "analytics.refresh"
