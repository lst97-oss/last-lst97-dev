import { createFileRoute } from '@tanstack/react-router'
import { handleEndpoints } from 'payload'
import config from '@payload-config'

async function payloadHandler({ request }: { request: Request }) {
  const url = new URL(request.url)
  // handleEndpoints expects the FULL pathname including /api base (it strips
  // baseAPIPath itself via formatAdminURL). Passing only the suffix 404s.
  const path = `${url.pathname}${url.search}`
  return handleEndpoints({
    basePath: '/api',
    config,
    path,
    request: request.clone(),
  })
}

export async function GET(ctx: { request: Request }) {
  return payloadHandler(ctx)
}

export async function POST(ctx: { request: Request }) {
  return payloadHandler(ctx)
}

export async function PUT(ctx: { request: Request }) {
  return payloadHandler(ctx)
}

export async function PATCH(ctx: { request: Request }) {
  return payloadHandler(ctx)
}

export async function DELETE(ctx: { request: Request }) {
  return payloadHandler(ctx)
}

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET,
      POST,
      PUT,
      PATCH,
      DELETE,
    },
  },
})
