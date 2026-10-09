#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { createClientFromEnv, MeiliotApiError } from "./client.js";
function str(v) {
    return typeof v === "string" && v.length ? v : undefined;
}
function jsonResult(data) {
    return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
}
function errorResult(err) {
    if (err instanceof MeiliotApiError) {
        return {
            isError: true,
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ status: err.status, body: err.body }, null, 2),
                },
            ],
        };
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
        isError: true,
        content: [{ type: "text", text: message }],
    };
}
const tools = [
    {
        name: "meiliot_get_me",
        description: "Get token owner, plan limits and API phases",
        inputSchema: { type: "object", properties: {} },
        handler: (c) => c.get("/me"),
    },
    {
        name: "meiliot_get_ai_context",
        description: "Snapshot for agents: business context, sites, counts, limits",
        inputSchema: {
            type: "object",
            properties: { site: { type: "string", description: "Optional studio_subdomain_id" } },
        },
        handler: (c, a) => c.get("/me/ai-context", { site: str(a.site) }),
    },
    {
        name: "meiliot_get_business_context",
        description: "Read business context (profile or site)",
        inputSchema: {
            type: "object",
            properties: { site: { type: "string" } },
        },
        handler: (c, a) => c.get("/me/business-context", { site: str(a.site) }),
    },
    {
        name: "meiliot_patch_business_context",
        description: "Update business context fields",
        inputSchema: {
            type: "object",
            properties: {
                site: { type: "string" },
                patch: { type: "object", additionalProperties: { type: "string" } },
            },
            required: ["patch"],
        },
        handler: (c, a) => {
            const path = a.site
                ? `/me/business-context?site=${encodeURIComponent(String(a.site))}`
                : "/me/business-context";
            return c.patch(path, a.patch);
        },
    },
    {
        name: "meiliot_send_email",
        description: "Send email via Meiliot gateway (verified from + plan quotas). Required: from, to, subject, html.",
        inputSchema: {
            type: "object",
            properties: {
                from: { type: "string", description: "Verified sender address" },
                to: {
                    oneOf: [
                        { type: "string" },
                        { type: "array", items: { type: "string" } },
                    ],
                },
                subject: { type: "string" },
                html: { type: "string" },
                text: { type: "string" },
                reply_to: { type: "string" },
            },
            required: ["from", "to", "subject", "html"],
        },
        handler: (c, a) => c.post("/emails/send", a),
    },
    {
        name: "meiliot_emails_quota",
        description: "Get email send quota",
        inputSchema: { type: "object", properties: {} },
        handler: (c) => c.get("/emails/quota"),
    },
    {
        name: "meiliot_templates_list",
        description: "List email templates",
        inputSchema: { type: "object", properties: {} },
        handler: (c) => c.get("/templates"),
    },
    {
        name: "meiliot_templates_get",
        description: "Get email template by id",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
        },
        handler: (c, a) => c.get(`/templates/${a.id}`),
    },
    {
        name: "meiliot_templates_create",
        description: "Create email template",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string" },
                subject: { type: "string" },
                html_content: { type: "string" },
                text_content: { type: "string" },
            },
            required: ["name"],
        },
        handler: (c, a) => c.post("/templates", a),
    },
    {
        name: "meiliot_templates_update",
        description: "Update email template",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string" },
                patch: { type: "object" },
            },
            required: ["id", "patch"],
        },
        handler: (c, a) => c.patch(`/templates/${a.id}`, a.patch),
    },
    {
        name: "meiliot_templates_delete",
        description: "Delete email template",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
        },
        handler: (c, a) => c.delete(`/templates/${a.id}`),
    },
    {
        name: "meiliot_products_list",
        description: "List store products",
        inputSchema: {
            type: "object",
            properties: {
                limit: { type: "string" },
                status: { type: "string" },
                q: { type: "string" },
            },
        },
        handler: (c, a) => c.get("/products", {
            limit: str(a.limit),
            status: str(a.status),
            q: str(a.q),
        }),
    },
    {
        name: "meiliot_products_get",
        description: "Get product by id",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
        },
        handler: (c, a) => c.get(`/products/${a.id}`),
    },
    {
        name: "meiliot_products_create",
        description: "Create store product",
        inputSchema: {
            type: "object",
            properties: { body: { type: "object" } },
            required: ["body"],
        },
        handler: (c, a) => c.post("/products", a.body),
    },
    {
        name: "meiliot_products_update",
        description: "Update store product",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" }, patch: { type: "object" } },
            required: ["id", "patch"],
        },
        handler: (c, a) => c.patch(`/products/${a.id}`, a.patch),
    },
    {
        name: "meiliot_products_delete",
        description: "Delete store product",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
        },
        handler: (c, a) => c.delete(`/products/${a.id}`),
    },
    {
        name: "meiliot_forms_list",
        description: "List forms",
        inputSchema: { type: "object", properties: {} },
        handler: (c) => c.get("/forms"),
    },
    {
        name: "meiliot_forms_get",
        description: "Get form",
        inputSchema: {
            type: "object",
            properties: { formId: { type: "string" } },
            required: ["formId"],
        },
        handler: (c, a) => c.get(`/forms/${a.formId}`),
    },
    {
        name: "meiliot_forms_create",
        description: "Create form (plan limit)",
        inputSchema: {
            type: "object",
            properties: { body: { type: "object" } },
            required: ["body"],
        },
        handler: (c, a) => c.post("/forms", a.body),
    },
    {
        name: "meiliot_forms_update",
        description: "Update form",
        inputSchema: {
            type: "object",
            properties: { formId: { type: "string" }, patch: { type: "object" } },
            required: ["formId", "patch"],
        },
        handler: (c, a) => c.patch(`/forms/${a.formId}`, a.patch),
    },
    {
        name: "meiliot_forms_delete",
        description: "Delete form",
        inputSchema: {
            type: "object",
            properties: { formId: { type: "string" } },
            required: ["formId"],
        },
        handler: (c, a) => c.delete(`/forms/${a.formId}`),
    },
    {
        name: "meiliot_forms_submit",
        description: "Create form submission",
        inputSchema: {
            type: "object",
            properties: { formId: { type: "string" }, body: { type: "object" } },
            required: ["formId", "body"],
        },
        handler: (c, a) => c.post(`/forms/${a.formId}/submissions`, a.body),
    },
    {
        name: "meiliot_calendars_list",
        description: "List calendars",
        inputSchema: { type: "object", properties: {} },
        handler: (c) => c.get("/calendars"),
    },
    {
        name: "meiliot_calendars_get",
        description: "Get calendar",
        inputSchema: {
            type: "object",
            properties: { calendarId: { type: "string" } },
            required: ["calendarId"],
        },
        handler: (c, a) => c.get(`/calendars/${a.calendarId}`),
    },
    {
        name: "meiliot_calendars_create",
        description: "Create calendar (plan limit)",
        inputSchema: {
            type: "object",
            properties: { body: { type: "object" } },
            required: ["body"],
        },
        handler: (c, a) => c.post("/calendars", a.body),
    },
    {
        name: "meiliot_calendars_update",
        description: "Update calendar",
        inputSchema: {
            type: "object",
            properties: { calendarId: { type: "string" }, patch: { type: "object" } },
            required: ["calendarId", "patch"],
        },
        handler: (c, a) => c.patch(`/calendars/${a.calendarId}`, a.patch),
    },
    {
        name: "meiliot_calendars_delete",
        description: "Delete calendar",
        inputSchema: {
            type: "object",
            properties: { calendarId: { type: "string" } },
            required: ["calendarId"],
        },
        handler: (c, a) => c.delete(`/calendars/${a.calendarId}`),
    },
    {
        name: "meiliot_calendars_book",
        description: "Create calendar booking",
        inputSchema: {
            type: "object",
            properties: { calendarId: { type: "string" }, body: { type: "object" } },
            required: ["calendarId", "body"],
        },
        handler: (c, a) => c.post(`/calendars/${a.calendarId}/bookings`, a.body),
    },
    {
        name: "meiliot_lists_list",
        description: "List contact lists",
        inputSchema: { type: "object", properties: {} },
        handler: (c) => c.get("/lists"),
    },
    {
        name: "meiliot_lists_create",
        description: "Create contact list",
        inputSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
        },
        handler: (c, a) => c.post("/lists", { name: a.name }),
    },
    {
        name: "meiliot_lists_delete",
        description: "Delete contact list",
        inputSchema: {
            type: "object",
            properties: { listId: { type: "string" } },
            required: ["listId"],
        },
        handler: (c, a) => c.delete(`/lists/${a.listId}`),
    },
    {
        name: "meiliot_lists_contacts",
        description: "List contacts in a list",
        inputSchema: {
            type: "object",
            properties: {
                listId: { type: "string" },
                limit: { type: "string" },
                cursor: { type: "string" },
            },
            required: ["listId"],
        },
        handler: (c, a) => c.get(`/lists/${a.listId}/contacts`, {
            limit: str(a.limit),
            cursor: str(a.cursor),
        }),
    },
    {
        name: "meiliot_lists_add_contact",
        description: "Upsert contact into list (contacts_limit)",
        inputSchema: {
            type: "object",
            properties: { listId: { type: "string" }, body: { type: "object" } },
            required: ["listId", "body"],
        },
        handler: (c, a) => c.post(`/lists/${a.listId}/contacts`, a.body),
    },
    {
        name: "meiliot_workflows_list",
        description: "List workflows",
        inputSchema: { type: "object", properties: {} },
        handler: (c) => c.get("/workflows"),
    },
    {
        name: "meiliot_workflows_get",
        description: "Get workflow",
        inputSchema: {
            type: "object",
            properties: { workflowId: { type: "string" } },
            required: ["workflowId"],
        },
        handler: (c, a) => c.get(`/workflows/${a.workflowId}`),
    },
    {
        name: "meiliot_workflows_create",
        description: "Create workflow (plan limit)",
        inputSchema: {
            type: "object",
            properties: { body: { type: "object" } },
            required: ["body"],
        },
        handler: (c, a) => c.post("/workflows", a.body),
    },
    {
        name: "meiliot_workflows_update",
        description: "Update workflow",
        inputSchema: {
            type: "object",
            properties: { workflowId: { type: "string" }, patch: { type: "object" } },
            required: ["workflowId", "patch"],
        },
        handler: (c, a) => c.patch(`/workflows/${a.workflowId}`, a.patch),
    },
    {
        name: "meiliot_workflows_delete",
        description: "Delete workflow",
        inputSchema: {
            type: "object",
            properties: { workflowId: { type: "string" } },
            required: ["workflowId"],
        },
        handler: (c, a) => c.delete(`/workflows/${a.workflowId}`),
    },
    {
        name: "meiliot_workflows_emails_list",
        description: "List email nodes in workflow",
        inputSchema: {
            type: "object",
            properties: { workflowId: { type: "string" } },
            required: ["workflowId"],
        },
        handler: (c, a) => c.get(`/workflows/${a.workflowId}/emails`),
    },
    {
        name: "meiliot_workflows_emails_upsert",
        description: "Add or update email node in workflow",
        inputSchema: {
            type: "object",
            properties: { workflowId: { type: "string" }, body: { type: "object" } },
            required: ["workflowId", "body"],
        },
        handler: (c, a) => c.post(`/workflows/${a.workflowId}/emails`, a.body),
    },
    {
        name: "meiliot_workflows_emails_delete",
        description: "Remove email node from workflow",
        inputSchema: {
            type: "object",
            properties: { workflowId: { type: "string" }, nodeId: { type: "string" } },
            required: ["workflowId", "nodeId"],
        },
        handler: (c, a) => c.delete(`/workflows/${a.workflowId}/emails/${a.nodeId}`),
    },
    {
        name: "meiliot_workflows_trigger",
        description: "Trigger workflow for contact_ids",
        inputSchema: {
            type: "object",
            properties: {
                workflowId: { type: "string" },
                contact_ids: { type: "array", items: { type: "string" } },
            },
            required: ["workflowId", "contact_ids"],
        },
        handler: (c, a) => c.post(`/workflows/${a.workflowId}/trigger`, {
            contact_ids: a.contact_ids,
        }),
    },
    {
        name: "meiliot_funnels_list",
        description: "List funnels",
        inputSchema: { type: "object", properties: {} },
        handler: (c) => c.get("/funnels"),
    },
    {
        name: "meiliot_funnels_get",
        description: "Get funnel",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
        },
        handler: (c, a) => c.get(`/funnels/${a.id}`),
    },
    {
        name: "meiliot_funnels_create",
        description: "Create funnel (plan limit)",
        inputSchema: {
            type: "object",
            properties: { body: { type: "object" } },
            required: ["body"],
        },
        handler: (c, a) => c.post("/funnels", a.body),
    },
    {
        name: "meiliot_funnels_update",
        description: "Update funnel",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" }, patch: { type: "object" } },
            required: ["id", "patch"],
        },
        handler: (c, a) => c.patch(`/funnels/${a.id}`, a.patch),
    },
    {
        name: "meiliot_funnels_delete",
        description: "Delete funnel",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
        },
        handler: (c, a) => c.delete(`/funnels/${a.id}`),
    },
    {
        name: "meiliot_funnels_steps_get",
        description: "List funnel steps",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
        },
        handler: (c, a) => c.get(`/funnels/${a.id}/steps`),
    },
    {
        name: "meiliot_funnels_steps_put",
        description: "Replace funnel steps",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" }, body: { type: "object" } },
            required: ["id", "body"],
        },
        handler: (c, a) => c.put(`/funnels/${a.id}/steps`, a.body),
    },
    {
        name: "meiliot_studio_sites_list",
        description: "List Studio sites (subdomains). Returns id, slug, main_page, public_urls (e.g. https://{slug}.meiliot.com/). Use studio_subdomain_id from here when creating pages.",
        inputSchema: { type: "object", properties: {} },
        handler: (c) => c.get("/studio/sites"),
    },
    {
        name: "meiliot_studio_pages_list",
        description: "List Studio landing pages (optional filter by site)",
        inputSchema: {
            type: "object",
            properties: {
                studio_subdomain_id: {
                    type: "string",
                    description: "Filter by site UUID from meiliot_studio_sites_list",
                },
            },
        },
        handler: (c, a) => c.get("/studio/pages", {
            studio_subdomain_id: str(a.studio_subdomain_id),
        }),
    },
    {
        name: "meiliot_studio_pages_get",
        description: "Get Studio page (includes public_urls)",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
        },
        handler: (c, a) => c.get(`/studio/pages/${a.id}`),
    },
    {
        name: "meiliot_studio_pages_create",
        description: "Create a Studio landing page with HTML/CSS. Required: studio_subdomain_id + title. Set is_main_page=true to serve at site root (/). Set status=published (or is_main_page) so /{slug} is public. Returns public_urls.",
        inputSchema: {
            type: "object",
            properties: {
                studio_subdomain_id: {
                    type: "string",
                    description: "Site UUID from meiliot_studio_sites_list",
                },
                title: { type: "string" },
                slug: { type: "string" },
                html: { type: "string", description: "Full page HTML body/content" },
                css: { type: "string", description: "Page CSS (persisted)" },
                status: {
                    type: "string",
                    description: "draft | published (auto sets published_at)",
                },
                is_main_page: {
                    type: "boolean",
                    description: "If true, becomes the only homepage for the site (root URL)",
                },
                seo_title: { type: "string" },
                seo_description: { type: "string" },
                gjs_data: { type: "object" },
                body: {
                    type: "object",
                    description: "Optional nested body (merged with top-level fields)",
                },
            },
            required: ["studio_subdomain_id", "title"],
        },
        handler: (c, a) => {
            const nested = a.body && typeof a.body === "object"
                ? a.body
                : {};
            const { body: _ignore, ...top } = a;
            return c.post("/studio/pages", { ...nested, ...top });
        },
    },
    {
        name: "meiliot_studio_pages_update",
        description: "Update Studio page fields (html, css, status, is_main_page, slug, seo…). Setting is_main_page=true demotes the previous homepage. status=published sets published_at.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string" },
                title: { type: "string" },
                slug: { type: "string" },
                html: { type: "string" },
                css: { type: "string" },
                status: { type: "string" },
                is_main_page: { type: "boolean" },
                published_at: { type: "string" },
                seo_title: { type: "string" },
                seo_description: { type: "string" },
                og_image: { type: "string" },
                gjs_data: { type: "object" },
                patch: {
                    type: "object",
                    description: "Optional nested patch (merged with top-level fields)",
                },
            },
            required: ["id"],
        },
        handler: (c, a) => {
            const nested = a.patch && typeof a.patch === "object"
                ? a.patch
                : {};
            const { id, patch: _ignore, ...top } = a;
            return c.patch(`/studio/pages/${id}`, { ...nested, ...top });
        },
    },
    {
        name: "meiliot_studio_pages_delete",
        description: "Delete Studio page (not system pages)",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
        },
        handler: (c, a) => c.delete(`/studio/pages/${a.id}`),
    },
    {
        name: "meiliot_analytics_get",
        description: "Campaign analytics aggregates",
        inputSchema: {
            type: "object",
            properties: {
                dateRange: {
                    type: "string",
                    description: "7d | 30d | 90d | all",
                },
            },
        },
        handler: (c, a) => c.get("/analytics", { dateRange: str(a.dateRange) || "all" }),
    },
    {
        name: "meiliot_invoices_list",
        description: "List store invoices",
        inputSchema: {
            type: "object",
            properties: { limit: { type: "string" }, origin: { type: "string" } },
        },
        handler: (c, a) => c.get("/invoices", { limit: str(a.limit), origin: str(a.origin) }),
    },
    {
        name: "meiliot_invoices_create",
        description: "Create manual store invoice",
        inputSchema: {
            type: "object",
            properties: { body: { type: "object" } },
            required: ["body"],
        },
        handler: (c, a) => c.post("/invoices", a.body),
    },
    {
        name: "meiliot_webhooks_list",
        description: "List webhooks",
        inputSchema: { type: "object", properties: {} },
        handler: (c) => c.get("/webhooks"),
    },
    {
        name: "meiliot_webhooks_create",
        description: "Create webhook (secret shown once)",
        inputSchema: {
            type: "object",
            properties: { body: { type: "object" } },
            required: ["body"],
        },
        handler: (c, a) => c.post("/webhooks", a.body),
    },
    {
        name: "meiliot_webhooks_delete",
        description: "Delete webhook",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
        },
        handler: (c, a) => c.delete(`/webhooks/${a.id}`),
    },
];
async function main() {
    const client = createClientFromEnv();
    const server = new Server({ name: "meiliot-mcp", version: "1.0.0" }, { capabilities: { tools: {}, resources: {} } });
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
        })),
    }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const tool = tools.find((t) => t.name === request.params.name);
        if (!tool) {
            return errorResult(new Error(`Unknown tool: ${request.params.name}`));
        }
        try {
            const args = (request.params.arguments || {});
            const data = await tool.handler(client, args);
            return jsonResult(data);
        }
        catch (err) {
            return errorResult(err);
        }
    });
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: [
            {
                uri: "meiliot://openapi",
                name: "Meiliot Public API OpenAPI",
                mimeType: "application/json",
                description: "OpenAPI snapshot from GET /api/v1/openapi",
            },
        ],
    }));
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        if (request.params.uri !== "meiliot://openapi") {
            throw new Error(`Unknown resource: ${request.params.uri}`);
        }
        const data = await client.get("/openapi");
        return {
            contents: [
                {
                    uri: "meiliot://openapi",
                    mimeType: "application/json",
                    text: JSON.stringify(data, null, 2),
                },
            ],
        };
    });
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
