import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

const SLACK_OAUTH_URL = "https://slack.com/oauth/v2/authorize";
const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";
const SLACK_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage";

export function getSlackAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: "chat:write,channels:read",
    redirect_uri: env.SLACK_REDIRECT_URI,
    state,
  });
  return `${SLACK_OAUTH_URL}?${params.toString()}`;
}

interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  team?: { id: string; name: string };
  authed_user?: { id: string };
  incoming_webhook?: { channel_id: string };
  error?: string;
}

export async function exchangeSlackCode(code: string): Promise<SlackOAuthResponse> {
  const response = await fetch(SLACK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: env.SLACK_REDIRECT_URI,
    }),
  });

  return (await response.json()) as SlackOAuthResponse;
}

export async function saveSlackConnection(
  userId: string,
  data: SlackOAuthResponse
): Promise<void> {
  if (!data.access_token) return;

  await prisma.slackConnection.upsert({
    where: { userId },
    update: {
      accessToken: data.access_token,
      teamId: data.team?.id,
      teamName: data.team?.name,
      slackUserId: data.authed_user?.id,
      channelId: data.incoming_webhook?.channel_id,
    },
    create: {
      userId,
      accessToken: data.access_token,
      teamId: data.team?.id,
      teamName: data.team?.name,
      slackUserId: data.authed_user?.id,
      channelId: data.incoming_webhook?.channel_id,
    },
  });
}

export async function disconnectSlack(userId: string): Promise<void> {
  await prisma.slackConnection.deleteMany({ where: { userId } });
}

export async function getSlackStatus(userId: string) {
  const connection = await prisma.slackConnection.findUnique({ where: { userId } });
  return {
    connected: !!connection,
    teamName: connection?.teamName ?? null,
  };
}

/**
 * Sends a real Slack message via the chat.postMessage API. If the user has
 * no Slack connection, this silently does nothing - it must never throw or
 * block email sending/scheduling.
 */
export async function sendRateLimitSlackNotification(params: {
  userId: string;
  senderEmail: string;
  hourlyLimit: number;
  windowStart: string;
  windowEnd: string;
}): Promise<void> {
  try {
    const connection = await prisma.slackConnection.findUnique({
      where: { userId: params.userId },
    });

    if (!connection) {
      // Not connected - do nothing, do not fail the email flow.
      return;
    }

    const channel = connection.channelId || connection.slackUserId;
    if (!channel) {
      logger.warn("Slack connected but no channel/user id available to message", {
        userId: params.userId,
      });
      return;
    }

    const text =
      `Email rate limit reached\n\n` +
      `Sender: ${params.senderEmail}\n` +
      `Hourly limit: ${params.hourlyLimit}\n` +
      `Current hour: ${params.windowStart} - ${params.windowEnd}\n\n` +
      `Emails will continue in the next available window.`;

    const response = await fetch(SLACK_POST_MESSAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${connection.accessToken}`,
      },
      body: JSON.stringify({ channel, text }),
    });

    const result = (await response.json()) as { ok: boolean; error?: string };
    if (!result.ok) {
      logger.error("Slack API returned an error", { error: result.error });
      return;
    }

    logger.info("Slack notification sent", { senderEmail: params.senderEmail });
  } catch (err) {
    // Never let a Slack failure fail email scheduling.
    logger.error("Failed to send Slack notification", { error: String(err) });
  }
}
