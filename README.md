# meiliot-mcp

Serveur [MCP](https://modelcontextprotocol.io) **stdio** pour [Meiliot](https://www.meiliot.com).

Tous les tools appellent uniquement la Public API `/api/v1` avec un **Bearer token** utilisateur (pas de cookie, pas de service-role).

- Doc API : [docs.meiliot.com / PUBLIC-API](https://www.meiliot.com/dashboard/developers) · OpenAPI `GET /api/v1/openapi`
- Repo : https://github.com/vjdqvjh/meiliot-mcp

## Install rapide (Cursor)

Dans Cursor → Settings → MCP, ou fichier `mcp.json` :

```json
{
  "mcpServers": {
    "meiliot": {
      "command": "npx",
      "args": ["-y", "github:vjdqvjh/meiliot-mcp"],
      "env": {
        "MEILIOT_API_TOKEN": "YOUR_64_HEX_TOKEN",
        "MEILIOT_BASE_URL": "https://www.meiliot.com"
      }
    }
  }
}
```

Le token se crée dans **Meiliot → Settings → API Token**.

### Variantes

```bash
# Clone + install local
git clone https://github.com/vjdqvjh/meiliot-mcp.git
cd meiliot-mcp
npm install
npm start
```

```json
{
  "command": "node",
  "args": ["/chemin/absolu/meiliot-mcp/dist/index.js"],
  "env": {
    "MEILIOT_API_TOKEN": "…",
    "MEILIOT_BASE_URL": "https://www.meiliot.com"
  }
}
```

En local contre un serveur de dev Meiliot : `MEILIOT_BASE_URL=http://localhost:3000`.

## Variables d’environnement

| Var | Requis | Défaut |
|-----|--------|--------|
| `MEILIOT_API_TOKEN` | oui | — |
| `MEILIOT_BASE_URL` | non | `https://www.meiliot.com` |

## Prérequis

- Node.js **18+**
- Compte Meiliot + jeton API (64 hex)

## Tools (aperçu)

| Domaine | Tools |
|---------|--------|
| Compte | `meiliot_get_me`, `meiliot_get_ai_context`, `meiliot_*_business_context` |
| Emails | `meiliot_send_email`, `meiliot_emails_quota`, `meiliot_templates_*` |
| Produits | `meiliot_products_*` |
| Forms / calendars | `meiliot_forms_*`, `meiliot_calendars_*` |
| Lists | `meiliot_lists_*` |
| Workflows | `meiliot_workflows_*` |
| Funnels / Studio | `meiliot_funnels_*`, `meiliot_studio_*` |
| Analytics / invoices / webhooks | `meiliot_analytics_get`, `meiliot_invoices_*`, `meiliot_webhooks_*` |

Resource : `meiliot://openapi` → snapshot OpenAPI.

## Développement

```bash
npm install
npm run build
npm run dev
```

## Sécurité

- Le token donne un accès **complet** au compte (comme l’API publique).
- Ne jamais committer `MEILIOT_API_TOKEN`.
- Les quotas plan (emails, workflows, forms, landings, contacts…) sont appliqués côté API.

## Licence

MIT
