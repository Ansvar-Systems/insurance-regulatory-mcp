# Tools — Insurance Regulatory Intelligence MCP

All tools are plain-named (domain MCP convention). Every response includes a `_meta` object with `disclaimer`, `data_age`, and `source_url`. This MCP is premium-enabled — full access requires an Ansvar premium subscription.

---

## search_insurance_standards

Full-text search across IAIS ICPs, Application Papers, ComFrame, NAIC Model Laws, and Lloyd's Market Requirements.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search query (e.g., "risk management", "capital adequacy", "cyber insurance") |
| `domain` | string | No | Filter by domain or category |
| `limit` | number | No | Max results (default 10, max 50) |

### Example Call

```json
{
  "name": "search_insurance_standards",
  "arguments": {
    "query": "cyber insurance underwriting",
    "limit": 5
  }
}
```

### Example Response

```json
{
  "results": [
    {
      "type": "control",
      "reference": "AP-CYBER-2023",
      "title": "Application Paper on Supervision of Insurer Cyber Risk",
      "domain": "Application Papers",
      "summary": "Guidance to supervisors on applying ICP 8 in the context of cyber risk..."
    }
  ],
  "count": 1,
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: quarterly",
    "source_url": "https://www.iaisweb.org/activities-topics/insurance-core-principles/"
  }
}
```

---

## get_insurance_standard

Get a specific IAIS standard, ICP, or application paper by its reference identifier.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `standard_id` | string | Yes | ICP number (e.g., "ICP-16"), application paper reference (e.g., "AP-CYBER-2023"), or supplementary reference (e.g., "NAIC-MDL-668") |

### Example Call

```json
{
  "name": "get_insurance_standard",
  "arguments": {
    "standard_id": "ICP-16"
  }
}
```

### Example Response

```json
{
  "control_ref": "ICP-16",
  "title": "ICP 16 — Enterprise Risk Management for Solvency Purposes",
  "domain": "Insurance Core Principles",
  "framework_id": "iais-icp",
  "description": "The supervisor requires the insurer to establish and implement an enterprise risk management framework...",
  "_citation": {
    "canonical_ref": "ICP-16",
    "display_text": "IAIS — ICP 16 — Enterprise Risk Management for Solvency Purposes (ICP-16)"
  },
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: quarterly",
    "source_url": "https://www.iaisweb.org/activities-topics/insurance-core-principles/"
  }
}
```

Returns an error if the reference is not found, with a suggestion to use `search_insurance_standards`.

---

## search_application_papers

Search IAIS Application Papers with optional framework and domain filters.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search query (e.g., "climate scenario analysis", "algorithmic underwriting") |
| `framework` | string | No | Filter by framework: `iais-icp`, `iais-comframe`, `iais-holistic`, `naic`, or `lloyds` |
| `domain` | string | No | Filter by topic domain |
| `limit` | number | No | Max results (default 10, max 50) |

### Example Call

```json
{
  "name": "search_application_papers",
  "arguments": {
    "query": "climate risk scenario",
    "framework": "iais-comframe",
    "limit": 5
  }
}
```

### Example Response

```json
{
  "results": [
    {
      "control_ref": "AP-CLIMATE-2021",
      "title": "Application Paper on Supervision of Climate-Related Risks",
      "domain": "Application Papers",
      "subdomain": "Climate Risk",
      "summary": "Guidance on physical, transition, and liability climate risks for insurers..."
    }
  ],
  "count": 1,
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: quarterly",
    "source_url": "https://www.iaisweb.org/activities-topics/insurance-core-principles/"
  }
}
```

---

## list_insurance_frameworks

List all insurance regulatory frameworks covered by this server.

### Parameters

None.

### Example Call

```json
{
  "name": "list_insurance_frameworks",
  "arguments": {}
}
```

### Example Response

```json
{
  "frameworks": [
    {
      "id": "iais-icp",
      "name": "IAIS Insurance Core Principles",
      "version": "2019 revision (2024 updates)",
      "effective_date": "2019-11-01",
      "control_count": 26,
      "domain": "Insurance Core Principles"
    },
    {
      "id": "iais-comframe",
      "name": "Common Framework for Internationally Active Insurance Groups (ComFrame)",
      "version": "2019 (integrated with ICPs)",
      "effective_date": "2019-11-01",
      "control_count": 12
    },
    {
      "id": "naic",
      "name": "NAIC Model Laws and Regulations",
      "version": "Current (selected cyber/data/privacy models)",
      "effective_date": "2023-01-01",
      "control_count": 15
    },
    {
      "id": "lloyds",
      "name": "Lloyd's Market Requirements",
      "version": "Current",
      "effective_date": "2023-01-01",
      "control_count": 10
    }
  ],
  "count": 5,
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: quarterly",
    "source_url": "https://www.iaisweb.org/activities-topics/insurance-core-principles/"
  }
}
```

---

## about

Return metadata about this MCP server: version, data sources, coverage summary, and available tools.

### Parameters

None.

### Example Call

```json
{
  "name": "about",
  "arguments": {}
}
```

### Example Response

```json
{
  "name": "insurance-regulatory-mcp",
  "version": "0.1.0",
  "description": "Insurance Regulatory Intelligence MCP server...",
  "data_source": "IAIS and international insurance standards",
  "source_url": "https://www.iaisweb.org/activities-topics/insurance-core-principles/",
  "coverage": {
    "frameworks": "5 insurance regulatory frameworks",
    "standards": "26 ICPs and application paper entries",
    "supplementary": "7 supplementary standards (NAIC/Lloyd's)",
    "jurisdictions": ["INTL"],
    "sectors": ["Insurance", "Reinsurance", "Insurance Groups", "Cyber Underwriting"]
  },
  "premium_enabled": true,
  "tools": [
    { "name": "search_insurance_standards", "description": "..." },
    { "name": "get_insurance_standard", "description": "..." },
    { "name": "search_application_papers", "description": "..." },
    { "name": "list_insurance_frameworks", "description": "..." },
    { "name": "about", "description": "..." },
    { "name": "list_sources", "description": "..." }
  ],
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: quarterly",
    "source_url": "https://www.iaisweb.org/activities-topics/insurance-core-principles/"
  }
}
```

---

## list_sources

Return data provenance information: which IAIS and supplementary sources are indexed, retrieval method, update frequency, and licensing terms.

### Parameters

None.

### Example Call

```json
{
  "name": "list_sources",
  "arguments": {}
}
```

### Example Response

```json
{
  "sources_yml": "schema_version: \"1.0\"\nmcp_name: \"Insurance Regulatory Intelligence MCP\"\n...",
  "note": "Data is sourced from official IAIS publications, NAIC, and Lloyd's of London. See sources.yml for full provenance.",
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: quarterly",
    "source_url": "https://www.iaisweb.org/activities-topics/insurance-core-principles/"
  }
}
```
