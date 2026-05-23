# lookout

Lookout is a threat intelligence platform concept focused on collecting, correlating, and presenting current cyber threat activity from multiple external data sources in a dashboard-driven workflow.

## Goals

- Collect threat intelligence from API reports, STIX/TAXII feeds, and public cybersecurity news.
- Track current cyber attacks, campaigns, known bad actors (APTs), IOCs, and vulnerabilities.
- Model relationships between actors, campaigns, malware, and affected technologies.
- Provide analyst-friendly pages for triage, hunting, and reporting.

## Data Sources

### 1) External APIs (reports and advisories)
Examples:
- CISA alerts and Known Exploited Vulnerabilities (KEV)
- Vendor advisories and IR reports
- OpenCTI/MISP-compatible API sources

### 2) STIX/TAXII feeds (structured threat intel)
Collected object types:
- intrusion-set (APT groups)
- campaign
- threat-actor
- indicator
- malware
- relationship

### 3) News and public articles
Examples:
- Security research blogs
- Incident response writeups
- Major cyber news publishers

## Core Pages

### Main Dashboard
A high-level threat state overview with:
- Current threat level summary (critical/high/medium/low trend)
- Recent campaigns and active actor count
- Region-based attack heat map
- Top targeted sectors and technologies
- New high-priority IOCs and CVEs in the last 24h/7d

### APTs Page
Details for known hacking groups:
- Group profile (aliases, origin, motivation)
- Associated campaigns and malware/tooling
- TTP mappings (MITRE ATT&CK)
- Recent activity timeline
- Relationship graph to campaigns and indicators

### IOCs Page
Searchable and filterable indicators of compromise:
- IP addresses
- Domains
- File hashes (MD5/SHA1/SHA256)
- Confidence score, first seen/last seen, source feed
- Linked actor/campaign/malware context

### CVEs Page
Sortable and searchable vulnerability intelligence:
- CVE ID, severity (CVSS), published/updated timestamps
- CISA KEV status and due-date context where available
- NIST NVD summary and references
- Exploit maturity/status and related threat activity
- Filters by product, score, KEV flag, and date

### News Page
Article intelligence summary:
- Normalized article feed with title, source, date, link
- AI-assisted short summary
- Extracted entities (actors, malware, CVEs, regions)
- Mapped relationships into the intelligence graph

## Threat Relationship Example

The platform should support relationship mapping such as:

- **Actor**: TeamPCP
- **Campaign Type**: Supply chain attack
- **Target/Impact**: Trivy ecosystem
- **Malware/Worm**: shai-hulud

Stored graph edges may include:
- TeamPCP `attributed-to` shai-hulud activity
- shai-hulud `targets` Trivy-related environments
- campaign `uses` malware and `references` related IOCs/CVEs

## Suggested Data Model

- `actors`: APT/threat actor profile records
- `campaigns`: campaign metadata and status
- `iocs`: indicator records with type, value, confidence, provenance
- `cves`: vulnerability records with KEV/NVD enrichment
- `news`: normalized article content and extracted entities
- `relationships`: actor↔campaign↔malware↔ioc↔cve graph edges

## Pipeline Overview

1. Ingest from APIs, STIX/TAXII, and news crawlers
2. Normalize and deduplicate artifacts
3. Enrich with CVE/KEV/NVD and ATT&CK mappings
4. Correlate entities into a relationship graph
5. Serve dashboard APIs for the UI pages above

## Non-Functional Requirements

- Scheduled and near-real-time ingestion support
- Source attribution for every record
- Auditability and confidence scoring
- Fast search and filtering for analyst workflows
- Role-based access controls for operational use
