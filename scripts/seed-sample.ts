/**
 * Seed the insurance regulatory database with sample frameworks, ICPs, application papers,
 * and supplementary standards (NAIC/Lloyd's).
 *
 * Usage:
 *   npx tsx scripts/seed-sample.ts
 *   npx tsx scripts/seed-sample.ts --force
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA_SQL } from "../src/db.js";

const DB_PATH = process.env["INSURANCE_DB_PATH"] ?? "data/insurance.db";
const force = process.argv.includes("--force");

const dir = dirname(DB_PATH);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
if (force && existsSync(DB_PATH)) {
  unlinkSync(DB_PATH);
  console.log(`Deleted ${DB_PATH}`);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(SCHEMA_SQL);
console.log(`Database initialised at ${DB_PATH}`);

// --- Frameworks ---------------------------------------------------------------

interface FrameworkRow {
  id: string;
  name: string;
  version: string;
  domain: string;
  framework: string;
  description: string;
  control_count: number;
  effective_date: string;
  pdf_url: string;
}

const frameworks: FrameworkRow[] = [
  {
    id: "iais-icp",
    name: "IAIS Insurance Core Principles",
    version: "2019 revision (2024 updates)",
    domain: "Insurance Core Principles",
    framework: "iais-icp",
    description:
      "The IAIS Insurance Core Principles (ICPs) form the globally recognised framework for insurance " +
      "supervision. They cover the full spectrum of supervisory requirements including licensing, " +
      "corporate governance, enterprise risk management, capital adequacy, conduct of business, " +
      "AML/CFT, group supervision, and cross-border cooperation. Originally issued in 2003 and " +
      "substantially revised in 2011 and 2019. 26 ICPs apply to all IAIS member jurisdictions.",
    control_count: 26,
    effective_date: "2019-11-01",
    pdf_url:
      "https://www.iaisweb.org/activities-topics/insurance-core-principles/",
  },
  {
    id: "iais-comframe",
    name: "Common Framework for Internationally Active Insurance Groups (ComFrame)",
    version: "2019 (integrated with ICPs)",
    domain: "Application Papers",
    framework: "iais-comframe",
    description:
      "ComFrame is the IAIS framework for the supervision of Internationally Active Insurance Groups " +
      "(IAIGs). It builds on the ICPs and establishes additional supervisory requirements specific to " +
      "IAIGs, covering group-wide supervision, intragroup transactions, capital adequacy assessment, " +
      "and supervisory college coordination. ComFrame was integrated into the ICP structure in 2019.",
    control_count: 12,
    effective_date: "2019-11-01",
    pdf_url:
      "https://www.iaisweb.org/activities-topics/comframe/",
  },
  {
    id: "iais-holistic",
    name: "IAIS Holistic Framework for Systemic Risk",
    version: "2019",
    domain: "Application Papers",
    framework: "iais-holistic",
    description:
      "The IAIS Holistic Framework for the Assessment and Mitigation of Systemic Risk in the Insurance " +
      "Sector replaced the G-SII (Global Systemically Important Insurer) framework. It takes an " +
      "activities-based approach to systemic risk, supplemented by entity-based measures for IAIGs " +
      "that pose elevated systemic risk. Includes the Insurance Capital Standard (ICS) as a group-wide " +
      "prescribed capital requirement for IAIGs.",
    control_count: 8,
    effective_date: "2019-11-01",
    pdf_url:
      "https://www.iaisweb.org/activities-topics/financial-stability/",
  },
  {
    id: "naic",
    name: "NAIC Model Laws and Regulations",
    version: "Current (selected cyber/data/privacy models)",
    domain: "Supplementary Standards",
    framework: "naic",
    description:
      "Selected NAIC (National Association of Insurance Commissioners) Model Laws relevant to " +
      "cybersecurity, data security, and privacy for US insurance supervisors and insurers. " +
      "Includes the Insurance Data Security Model Law (#668), the Privacy of Consumer Financial " +
      "and Health Information Model Regulation (#672), and the Cyber Risk Disclosure Survey.",
    control_count: 15,
    effective_date: "2023-01-01",
    pdf_url:
      "https://content.naic.org/model-laws",
  },
  {
    id: "lloyds",
    name: "Lloyd's Market Requirements",
    version: "Current",
    domain: "Supplementary Standards",
    framework: "lloyds",
    description:
      "Lloyd's Minimum Standards for Managing Agents and Minimum Standards for Cyber Insurance " +
      "Underwriting. Covers governance, risk management, underwriting controls, exposure management, " +
      "and cyber insurance-specific requirements including silent cyber, ransomware exclusions, " +
      "and catastrophe scenario management for Lloyd's syndicates.",
    control_count: 10,
    effective_date: "2023-01-01",
    pdf_url:
      "https://www.lloyds.com/resources-and-services/market-resources",
  },
];

const insertFramework = db.prepare(
  "INSERT OR IGNORE INTO frameworks (id, name, version, domain, framework, description, control_count, effective_date, pdf_url) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
);
for (const f of frameworks) {
  insertFramework.run(
    f.id, f.name, f.version, f.domain, f.framework, f.description, f.control_count, f.effective_date, f.pdf_url,
  );
}
console.log(`Inserted ${frameworks.length} frameworks`);

// --- ICPs and Application Papers (stored as controls) -------------------------

interface ControlRow {
  framework_id: string;
  control_ref: string;
  domain: string;
  subdomain: string;
  title: string;
  description: string;
  maturity_level: string;
  priority: string;
}

const controls: ControlRow[] = [
  // --- IAIS Insurance Core Principles ---

  {
    framework_id: "iais-icp",
    control_ref: "ICP-1",
    domain: "Insurance Core Principles",
    subdomain: "Supervisory Objectives",
    title: "ICP 1 — Objectives, Powers and Responsibilities of the Supervisor",
    description:
      "The principal objective of insurance supervision is to promote the maintenance of a fair, safe, " +
      "and stable insurance sector for the benefit and protection of policyholders. The supervisor must " +
      "have the legal authority, powers, and resources to fulfil its mandate, including the power to " +
      "license, regulate, supervise, and take corrective action against insurers. The supervisor must " +
      "act with integrity, transparency, and accountability. It must cooperate and share information " +
      "with other supervisors and relevant authorities.",
    maturity_level: "Foundational",
    priority: "High",
  },
  {
    framework_id: "iais-icp",
    control_ref: "ICP-4",
    domain: "Insurance Core Principles",
    subdomain: "Licensing",
    title: "ICP 4 — Licensing",
    description:
      "Only entities that meet the requirements established by legislation and the supervisor are " +
      "allowed to engage in insurance activities. The supervisor must define the requirements for " +
      "obtaining and retaining a licence to conduct insurance business. Requirements cover legal form, " +
      "fit and proper criteria for owners and senior management, business plan, governance framework, " +
      "financial resources, and internal controls. The supervisor must have powers to refuse, suspend, " +
      "and revoke licences.",
    maturity_level: "Foundational",
    priority: "High",
  },
  {
    framework_id: "iais-icp",
    control_ref: "ICP-5",
    domain: "Insurance Core Principles",
    subdomain: "Suitability of Persons",
    title: "ICP 5 — Suitability of Persons",
    description:
      "The supervisor requires Board members, senior management, key persons in control functions, and " +
      "significant owners of an insurer to be and remain suitable to fulfil their respective roles. " +
      "Suitability encompasses integrity, competence, and financial soundness. The supervisor must have " +
      "the authority to assess suitability at the time of appointment and on an ongoing basis. Insurers " +
      "must have policies and processes for assessing and monitoring the suitability of key persons.",
    maturity_level: "Foundational",
    priority: "High",
  },
  {
    framework_id: "iais-icp",
    control_ref: "ICP-7",
    domain: "Insurance Core Principles",
    subdomain: "Corporate Governance",
    title: "ICP 7 — Corporate Governance",
    description:
      "The supervisor requires insurers to establish and implement a corporate governance framework " +
      "that provides for sound and prudent management and oversight of the insurer's business and " +
      "adequately recognises and protects the interests of policyholders. The Board must have overall " +
      "responsibility for the insurer. Governance requirements cover Board composition and functioning, " +
      "key control functions (risk management, compliance, internal audit, actuarial), remuneration " +
      "policies, and group governance structures.",
    maturity_level: "Foundational",
    priority: "High",
  },
  {
    framework_id: "iais-icp",
    control_ref: "ICP-8",
    domain: "Insurance Core Principles",
    subdomain: "Risk Management and Internal Controls",
    title: "ICP 8 — Risk Management and Internal Controls",
    description:
      "The supervisor requires the insurer to have as part of its overall corporate governance framework " +
      "an effective system of risk management and internal controls, including effective control functions " +
      "(risk management, compliance, internal audit, actuarial). The risk management system must cover " +
      "all material risks: underwriting, reserving, credit, market, operational, liquidity, legal, and " +
      "strategic risks. The Own Risk and Solvency Assessment (ORSA) is a key element requiring insurers " +
      "to assess their risk profile and capital needs on a forward-looking basis.",
    maturity_level: "Foundational",
    priority: "High",
  },
  {
    framework_id: "iais-icp",
    control_ref: "ICP-9",
    domain: "Insurance Core Principles",
    subdomain: "Supervisory Review and Reporting",
    title: "ICP 9 — Supervisory Review and Reporting",
    description:
      "The supervisor takes a risk-based approach to supervision that uses both off-site monitoring and " +
      "on-site inspection to examine the business of each insurer, evaluate compliance with legislation " +
      "and supervisory requirements, and address supervisory concerns. Supervisory review must be " +
      "proportionate to the nature, scale, and complexity of the insurer. Supervisory reporting must " +
      "include regular financial and statistical returns, narrative reporting on governance and risk, " +
      "and the ORSA report.",
    maturity_level: "Foundational",
    priority: "High",
  },
  {
    framework_id: "iais-icp",
    control_ref: "ICP-16",
    domain: "Insurance Core Principles",
    subdomain: "Enterprise Risk Management",
    title: "ICP 16 — Enterprise Risk Management for Solvency Purposes",
    description:
      "The supervisor requires the insurer to establish and implement an enterprise risk management " +
      "(ERM) framework for solvency purposes that identifies, assesses, measures, monitors, controls, " +
      "and reports on the risks to which it is or could be exposed and their interdependencies. The ERM " +
      "framework must cover all material risks and integrate with the insurer's business planning, " +
      "capital management, and strategic decision-making. The ORSA must assess current and prospective " +
      "solvency under base case and stressed scenarios.",
    maturity_level: "Foundational",
    priority: "High",
  },
  {
    framework_id: "iais-icp",
    control_ref: "ICP-17",
    domain: "Insurance Core Principles",
    subdomain: "Capital Adequacy",
    title: "ICP 17 — Capital Adequacy",
    description:
      "The supervisor establishes capital adequacy requirements for solvency purposes so that insurers " +
      "can absorb significant unforeseen losses. Requirements include a Prescribed Capital Requirement " +
      "(PCR) and a Minimum Capital Requirement (MCR). The PCR must be calibrated to ensure that, with " +
      "a high probability, the insurer can meet its obligations over a specified time horizon. Capital " +
      "must include the appropriate quality of financial resources. The supervisor must require prompt " +
      "corrective action when capital falls below required levels.",
    maturity_level: "Foundational",
    priority: "High",
  },
  {
    framework_id: "iais-icp",
    control_ref: "ICP-19",
    domain: "Insurance Core Principles",
    subdomain: "Conduct of Business",
    title: "ICP 19 — Conduct of Business",
    description:
      "The supervisor sets requirements for the conduct of insurance business to ensure customers are " +
      "treated fairly, both before and after a policy is entered into. Conduct of business requirements " +
      "cover product oversight and governance, disclosure and transparency, suitability of advice, " +
      "claims handling, complaints management, and fair treatment of vulnerable customers. Supervisors " +
      "must monitor and enforce conduct standards and take action where insurers treat customers unfairly.",
    maturity_level: "Foundational",
    priority: "High",
  },
  {
    framework_id: "iais-icp",
    control_ref: "ICP-22",
    domain: "Insurance Core Principles",
    subdomain: "Anti-Money Laundering and Combating Financing of Terrorism",
    title: "ICP 22 — Anti-Money Laundering and Combating the Financing of Terrorism",
    description:
      "The supervisor requires that insurers, at a minimum, comply with applicable AML/CFT laws and " +
      "regulations. Insurers must have policies and procedures to manage AML/CFT risks including " +
      "customer due diligence (CDD), enhanced due diligence (EDD) for higher-risk customers, " +
      "transaction monitoring, suspicious activity reporting, and record-keeping. The supervisor must " +
      "cooperate with financial intelligence units and other AML/CFT authorities. Life insurance and " +
      "annuity products carry elevated AML risk and require specific controls.",
    maturity_level: "Foundational",
    priority: "High",
  },
  {
    framework_id: "iais-icp",
    control_ref: "ICP-23",
    domain: "Insurance Core Principles",
    subdomain: "Group-Wide Supervision",
    title: "ICP 23 — Group-Wide Supervision",
    description:
      "The supervisor supervises insurers that are part of a group on a group-wide basis to address " +
      "risks arising from group structures. Group-wide supervision requires identifying the group, " +
      "determining the group-wide supervisor, assessing group-wide risks including contagion and " +
      "concentration risks, and reviewing intragroup transactions. A supervisory college must be " +
      "established for IAIGs. Group-wide capital adequacy must be assessed. The group-wide supervisor " +
      "coordinates supervisory actions across the group.",
    maturity_level: "Foundational",
    priority: "High",
  },
  {
    framework_id: "iais-icp",
    control_ref: "ICP-25",
    domain: "Insurance Core Principles",
    subdomain: "Supervisory Cooperation and Coordination",
    title: "ICP 25 — Supervisory Cooperation and Coordination",
    description:
      "The supervisor cooperates and coordinates with other relevant supervisors and authorities " +
      "subject to confidentiality requirements, both in normal times and in crisis situations. " +
      "Cross-border cooperation includes exchange of supervisory information, joint supervisory " +
      "activities, colleges of supervisors, and memoranda of understanding. The supervisor must have " +
      "a legal framework that enables information sharing with foreign supervisors. Crisis management " +
      "plans must address cross-border scenarios.",
    maturity_level: "Foundational",
    priority: "Medium",
  },

  // --- IAIS Application Papers ---

  {
    framework_id: "iais-comframe",
    control_ref: "AP-CYBER-2023",
    domain: "Application Papers",
    subdomain: "Cyber Risk",
    title: "Application Paper on Supervision of Insurer Cyber Risk",
    description:
      "This application paper provides guidance to supervisors on how to apply ICP 8 (Risk Management) " +
      "and related ICPs in the context of cyber risk. It covers identification and classification of " +
      "cyber risks facing insurers, governance and oversight of cyber risk, operational resilience " +
      "requirements, third-party and supply chain cyber risk, incident response and recovery, " +
      "supervisory review of insurer cyber risk management, and information sharing between supervisors. " +
      "The paper also addresses cyber insurance underwriting risk as distinct from operational cyber risk.",
    maturity_level: "Guidance",
    priority: "High",
  },
  {
    framework_id: "iais-comframe",
    control_ref: "AP-CLIMATE-2021",
    domain: "Application Papers",
    subdomain: "Climate Risk",
    title: "Application Paper on the Supervision of Climate-Related Risks",
    description:
      "This application paper provides guidance on how supervisors can apply the ICPs to address " +
      "climate-related risks in the insurance sector. It covers physical, transition, and liability " +
      "climate risks for insurers both as risk carriers (underwriting) and as institutional investors. " +
      "Key areas: climate risk in governance and risk management frameworks (ICP 7, ICP 8, ICP 16); " +
      "climate scenario analysis and stress testing; disclosure of climate-related financial information; " +
      "and supervisory approaches including climate risk assessments and supervisory expectations.",
    maturity_level: "Guidance",
    priority: "High",
  },
  {
    framework_id: "iais-comframe",
    control_ref: "AP-AI-2023",
    domain: "Application Papers",
    subdomain: "AI and Machine Learning",
    title: "Application Paper on the Use of Big Data Analytics in Insurance",
    description:
      "This application paper addresses the supervisory considerations arising from insurers' use of " +
      "big data analytics and artificial intelligence/machine learning (AI/ML) in underwriting, pricing, " +
      "claims, and distribution. Key supervisory concerns: fairness, discrimination and proxy " +
      "discrimination in algorithmic decision-making; explainability and model risk management; " +
      "data quality and governance; conduct of business implications (ICP 19); and the adequacy of " +
      "existing regulatory frameworks to address AI/ML-specific risks. Relevant to cyber insurance " +
      "pricing models using AI.",
    maturity_level: "Guidance",
    priority: "High",
  },
  {
    framework_id: "iais-comframe",
    control_ref: "AP-ESG-2023",
    domain: "Application Papers",
    subdomain: "ESG and Sustainability",
    title: "Application Paper on Supervising Sustainability Risks",
    description:
      "This application paper provides supervisors with guidance on incorporating sustainability risks " +
      "into insurance supervision, building on the climate risk application paper. It covers the broader " +
      "ESG risk universe including environmental risks beyond climate (biodiversity, pollution), social " +
      "risks (labour practices, supply chain), and governance risks. Key areas: ESG integration into " +
      "insurer ERM frameworks; ESG considerations in underwriting and investment; sustainability " +
      "disclosures; and supervisory approaches to greenwashing risk.",
    maturity_level: "Guidance",
    priority: "Medium",
  },
  {
    framework_id: "iais-comframe",
    control_ref: "AP-CONDUCT-2021",
    domain: "Application Papers",
    subdomain: "Conduct of Business",
    title: "Application Paper on Approaches to Supervising Conduct of Business",
    description:
      "This application paper provides practical guidance on how supervisors can effectively oversee " +
      "conduct of business under ICP 19. Key areas: market conduct examination frameworks; product " +
      "oversight and governance supervisory expectations; claims handling supervision including fair " +
      "claims outcomes; supervisory approaches to digital and algorithmic distribution channels; " +
      "treatment of vulnerable customers; and cross-border conduct supervision challenges. Includes " +
      "case studies from IAIS member supervisors.",
    maturity_level: "Guidance",
    priority: "High",
  },
  {
    framework_id: "iais-holistic",
    control_ref: "AP-SYSTEMIC-2022",
    domain: "Application Papers",
    subdomain: "Systemic Risk",
    title: "Application Paper on Liquidity Risk Management",
    description:
      "This application paper addresses liquidity risk management for insurers, relevant to the Holistic " +
      "Framework assessment of systemic risk. It covers liquidity risk identification and measurement, " +
      "liquidity stress testing and scenario analysis, liquidity risk governance and limits, contingency " +
      "funding plans, and the supervisory assessment of insurer liquidity risk. The paper recognises that " +
      "non-traditional insurance activities (derivatives, securities lending, guaranteed minimum products) " +
      "create elevated liquidity risk that may contribute to systemic risk.",
    maturity_level: "Guidance",
    priority: "Medium",
  },
  {
    framework_id: "iais-holistic",
    control_ref: "AP-ICS-2024",
    domain: "Application Papers",
    subdomain: "Insurance Capital Standard",
    title: "Insurance Capital Standard (ICS) Version 2.0",
    description:
      "The Insurance Capital Standard (ICS) is the IAIS group-wide prescribed capital requirement for " +
      "IAIGs, developed under ComFrame and the Holistic Framework. ICS Version 2.0 is in a five-year " +
      "monitoring period (2020-2024) with full implementation targeted for 2025. The ICS uses a " +
      "market-adjusted valuation approach for assets and liabilities. It covers all risk categories: " +
      "insurance risk, market risk, credit risk, operational risk, and aggregation. The ICS supports " +
      "comparability of group-wide capital adequacy across jurisdictions.",
    maturity_level: "Standard",
    priority: "High",
  },
];

const insertControl = db.prepare(
  "INSERT OR IGNORE INTO controls " +
    "(framework_id, control_ref, domain, subdomain, title, description, maturity_level, priority) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
);
for (const c of controls) {
  insertControl.run(
    c.framework_id, c.control_ref, c.domain, c.subdomain, c.title,
    c.description, c.maturity_level, c.priority,
  );
}
console.log(`Inserted ${controls.length} ICP and application paper entries`);

// --- Supplementary Standards (NAIC/Lloyd's, stored as circulars) ---------------

interface CircularRow {
  reference: string;
  title: string;
  date: string;
  category: string;
  summary: string;
  full_text: string;
  pdf_url: string;
  status: string;
}

const circulars: CircularRow[] = [
  {
    reference: "NAIC-MDL-668",
    title: "NAIC Insurance Data Security Model Law (Model #668)",
    date: "2017-10-24",
    category: "NAIC Model Laws",
    summary:
      "Establishes standards for developing and implementing an Information Security Program, " +
      "investigating cybersecurity events, and notifying the commissioner of cybersecurity events. " +
      "Adopted by 24+ US states. Based on the NY DFS Cybersecurity Regulation (23 NYCRR 500).",
    full_text:
      "NAIC Insurance Data Security Model Law (Model #668), adopted October 2017. " +
      "Purpose: Establish standards for developing and implementing an Information Security Program, " +
      "investigating Cybersecurity Events, and notifying the Commissioner of Cybersecurity Events. " +
      "Section 4 — Information Security Program: Each Licensee must develop, implement, and maintain " +
      "a comprehensive written Information Security Program containing administrative, technical, and " +
      "physical safeguards for the protection of Nonpublic Information. " +
      "The program must be based on the Licensee's Risk Assessment and contain the following elements: " +
      "(1) Designate a qualified individual to implement and oversee the program. " +
      "(2) Identify reasonably foreseeable internal or external threats to Nonpublic Information. " +
      "(3) Assess the likelihood and potential damage of identified threats. " +
      "(4) Assess the sufficiency of policies, procedures, customer information systems, and controls. " +
      "(5) Implement safeguards to manage identified risks. " +
      "Section 4F — Third-Party Service Provider Oversight: Select and retain Third-Party Service Providers " +
      "that maintain appropriate safeguards. Include provisions in contracts requiring Third-Party Service " +
      "Providers to implement and maintain appropriate safeguards. " +
      "Section 5 — Investigation of Cybersecurity Events: Conduct a prompt investigation upon learning of " +
      "a Cybersecurity Event. " +
      "Section 6 — Notification to Commissioner: Notify the Commissioner within 72 hours of determining " +
      "a Cybersecurity Event affecting 250 or more consumers. " +
      "Cybersecurity Event definition includes unauthorized access to or use of information systems or " +
      "Nonpublic Information, including events discovered by a Third-Party Service Provider.",
    pdf_url:
      "https://content.naic.org/sites/default/files/inline-files/MDL-668.pdf",
    status: "active",
  },
  {
    reference: "NAIC-MDL-672",
    title: "NAIC Privacy of Consumer Financial and Health Information Model Regulation (Model #672)",
    date: "2000-09-26",
    category: "NAIC Model Laws",
    summary:
      "Governs the treatment of nonpublic personal financial and health information by insurance " +
      "licensees. Implements Gramm-Leach-Bliley Act Title V privacy provisions for the insurance sector. " +
      "Requires privacy notices, opt-out rights, and limits on information sharing.",
    full_text:
      "NAIC Privacy of Consumer Financial and Health Information Model Regulation (Model #672). " +
      "Scope: Insurance licensees that collect or use nonpublic personal information about insurance " +
      "consumers residing in the state. " +
      "Section 4 — Initial Privacy Notice: At the time of establishing a customer relationship, provide " +
      "a clear and conspicuous notice describing the licensee's policies and practices with respect to " +
      "disclosing nonpublic personal financial information. " +
      "Section 5 — Annual Privacy Notice: Provide a privacy notice to each customer at least annually " +
      "during the continuation of the customer relationship. " +
      "Section 7 — Form of Opt-Out Notice: If sharing nonpublic personal financial information with " +
      "nonaffiliated third parties for marketing purposes, provide consumers an opt-out right. " +
      "Section 14 — Limits on Sharing Account Number Information: Do not disclose an account number " +
      "or similar form of access number to any nonaffiliated third party for marketing purposes. " +
      "Health Information: Special protections apply to nonpublic personal health information. " +
      "Disclosure requires consumer authorisation except for specific permitted purposes including " +
      "claims administration, underwriting, and legally required disclosures.",
    pdf_url:
      "https://content.naic.org/sites/default/files/inline-files/MDL-672.pdf",
    status: "active",
  },
  {
    reference: "NAIC-CYBER-SURVEY-2023",
    title: "NAIC Cyber Risk Disclosure Survey",
    date: "2023-03-01",
    category: "NAIC Model Laws",
    summary:
      "Annual NAIC survey of US insurer cyber risk disclosures examining the state of cybersecurity " +
      "preparedness across the insurance sector. Covers adoption of cyber risk management practices, " +
      "penetration testing, security frameworks, and cyber insurance purchase by insurers themselves.",
    full_text:
      "NAIC Cyber Risk Disclosure Survey 2023. " +
      "The survey examines how US insurance companies are managing cybersecurity risk and what they " +
      "are disclosing to their regulators. " +
      "Key findings from 2023 survey: " +
      "(1) 93% of surveyed insurers have a formal cybersecurity program in place. " +
      "(2) 87% conduct annual cybersecurity risk assessments. " +
      "(3) 78% conduct penetration testing at least annually. " +
      "(4) 71% have a formal incident response plan. " +
      "(5) 64% have Board-level cybersecurity oversight. " +
      "Regulatory Framework: The survey is conducted under the NAIC Insurance Data Security Model Law " +
      "(MDL-668) framework and the NAIC Cybersecurity and Privacy (C) Committee oversight. " +
      "Data Security Program Requirements: Insurers must certify to their domestic regulator that " +
      "their information security program complies with MDL-668 requirements. " +
      "Third-Party Risk: Third-party service provider oversight remains the most common gap, with " +
      "only 52% of insurers reporting formal third-party security assessment programs.",
    pdf_url:
      "https://content.naic.org/sites/default/files/publication-rbc-pb-cybersecurity.pdf",
    status: "active",
  },
  {
    reference: "LLOYDS-MS-CYBER-2023",
    title: "Lloyd's Minimum Standards — Cyber Insurance Underwriting (MS11)",
    date: "2023-01-01",
    category: "Lloyd's Market Requirements",
    summary:
      "Lloyd's Minimum Standards for cyber insurance underwriting by managing agents. Covers " +
      "risk appetite, exposure management, policy wording requirements, ransomware, silent cyber, " +
      "and catastrophe scenario management. Mandatory for all Lloyd's syndicates writing cyber.",
    full_text:
      "Lloyd's Minimum Standards MS11 — Cyber Underwriting, effective January 2023. " +
      "Applicability: All Lloyd's managing agents writing cyber insurance on Lloyd's syndicates. " +
      "MS11.1 — Cyber Risk Appetite: Managing agents must have a documented cyber underwriting risk " +
      "appetite approved by the board. The risk appetite must address: aggregate exposure limits by " +
      "industry sector and geography; maximum line size; attachment points for catastrophe scenarios. " +
      "MS11.2 — Policy Wordings: All cyber policy wordings must be reviewed and approved by the " +
      "underwriting function before use. Wordings must clearly define the scope of coverage and exclusions. " +
      "Silent Cyber: From January 2021, all Lloyd's policies must either affirmatively cover or " +
      "affirmatively exclude cyber risk. Unintentional or ambiguous cyber exposure ('silent cyber') " +
      "is not permitted. " +
      "MS11.3 — Ransomware: Managing agents must have specific controls for ransomware underwriting " +
      "including: minimum security standards for policyholders; ransomware coverage sub-limits; " +
      "exclusions for unpatched critical vulnerabilities; and claims data capture. " +
      "MS11.4 — Catastrophe Exposure Management: Managing agents must model their cyber catastrophe " +
      "exposure against Lloyd's prescribed scenarios including: cloud provider outage; operating system " +
      "vulnerability; financial services sector attack; and state-sponsored attack. " +
      "MS11.5 — Data and MI: Maintain sufficient data to monitor exposure accumulation, claims " +
      "experience, and performance of the cyber book. Report exposure data to Lloyd's quarterly.",
    pdf_url:
      "https://www.lloyds.com/conducting-business/market-oversight/acts-and-regulation/lloyds-minimum-standards",
    status: "active",
  },
  {
    reference: "LLOYDS-MS-GOVERNANCE-2023",
    title: "Lloyd's Minimum Standards — Governance (MS1)",
    date: "2023-01-01",
    category: "Lloyd's Market Requirements",
    summary:
      "Lloyd's Minimum Standards for managing agent governance. Covers Board composition, " +
      "risk management framework, key control functions, conflicts of interest, and the " +
      "Annual Report to Lloyd's. Mandatory for all Lloyd's managing agents.",
    full_text:
      "Lloyd's Minimum Standards MS1 — Governance, effective January 2023. " +
      "Applicability: All Lloyd's managing agents. " +
      "MS1.1 — Board Composition: The board must have an appropriate mix of skills, experience, and " +
      "independence. A minimum of one-third of board members must be independent non-executive directors. " +
      "The Chair and CEO roles must be separate. " +
      "MS1.2 — Risk Management: The managing agent must have an effective risk management framework " +
      "covering all material risks including underwriting risk, market risk, credit risk, operational " +
      "risk, liquidity risk, and reputational risk. The framework must include risk appetite, risk " +
      "identification and assessment, risk limits and escalation, and risk reporting to the Board. " +
      "MS1.3 — Key Control Functions: Independent risk management, compliance, and internal audit " +
      "functions must be in place. The Chief Risk Officer must have direct access to the Board. " +
      "MS1.4 — Conflicts of Interest: The managing agent must have a conflicts of interest policy " +
      "and register. Material conflicts must be disclosed to Lloyd's. " +
      "MS1.5 — Annual Report: The managing agent must submit an Annual Report to Lloyd's covering " +
      "strategy, financial performance, risk management, compliance, and the governance framework.",
    pdf_url:
      "https://www.lloyds.com/conducting-business/market-oversight/acts-and-regulation/lloyds-minimum-standards",
    status: "active",
  },
  {
    reference: "LLOYDS-CYBER-EXCLUSIONS-2023",
    title: "Lloyd's Market Bulletin — State-Backed Cyber Attack Exclusion Requirements",
    date: "2023-08-31",
    category: "Lloyd's Market Requirements",
    summary:
      "Lloyd's Market Bulletin Y5381 requiring all standalone cyber attack policies to include " +
      "a clear exclusion for losses arising from state-backed cyber attacks. Effective for " +
      "policies incepting from 31 March 2023. Addresses systemic cyber risk accumulation.",
    full_text:
      "Lloyd's Market Bulletin Y5381 — State-Backed Cyber Attack Exclusion, August 2022. " +
      "Effective date: Policies incepting from 31 March 2023 must comply. " +
      "Requirement: All standalone cyber attack policies must exclude losses arising from: " +
      "a cyber operation that is carried out by a state or those acting on its behalf; and " +
      "where the insured loss results from that attack. " +
      "Minimum Exclusion Elements: The exclusion must address: " +
      "(1) Attribution — how the state-backed nature of the attack is determined. " +
      "(2) War and cyber war — alignment with Lloyd's war exclusion requirements. " +
      "(3) Infrastructure attacks — critical infrastructure as elevated risk category. " +
      "Attribution Guidance: Attribution of a cyber attack to a state is a factual question. " +
      "Managing agents may use statements by relevant governments, intelligence agencies, or " +
      "other authoritative sources. Disputes must be resolved in accordance with the policy terms. " +
      "Lloyd's has published model clauses (LMA5564 series) to assist managing agents. " +
      "Systemic Risk Context: The exclusion addresses Lloyd's exposure to systemic cyber losses " +
      "from major state-backed attacks which could produce correlated losses across multiple " +
      "syndicates and exceed Lloyd's capacity to pay claims.",
    pdf_url:
      "https://www.lloyds.com/news-and-risk-insight/risk-reports/library/technology/managing-cyber-risk",
    status: "active",
  },
  {
    reference: "NAIC-MDL-880",
    title: "NAIC Cybersecurity Model Law for Small Insurers",
    date: "2022-01-01",
    category: "NAIC Model Laws",
    summary:
      "Scaled-down cybersecurity requirements for smaller insurance licensees exempt from full " +
      "MDL-668 compliance. Covers basic information security program requirements proportionate " +
      "to the size and complexity of the licensee.",
    full_text:
      "NAIC Cybersecurity Scaled Requirements for Small Insurers, developed under NAIC Cybersecurity " +
      "and Privacy (C) Committee. " +
      "Applicability: Insurance licensees with gross annual written premium less than $5 million in " +
      "cyber or $10 million across all lines, and fewer than 50 employees. " +
      "Simplified Information Security Program: Small licensees must maintain a written information " +
      "security program that is reasonably designed to: " +
      "(1) Protect the security, confidentiality, and integrity of Nonpublic Information. " +
      "(2) Protect against anticipated threats or hazards. " +
      "(3) Protect against unauthorized access or use. " +
      "Minimum Controls: At minimum, the program must address: employee training and management; " +
      "physical security; access controls; data retention and disposal; and incident response. " +
      "Third-Party Oversight: Must include reasonable oversight of third-party service providers " +
      "who have access to Nonpublic Information. " +
      "Notification: Same Cybersecurity Event notification requirements as MDL-668 apply to " +
      "small licensees (72 hours to commissioner for events affecting 250+ consumers).",
    pdf_url:
      "https://content.naic.org/sites/default/files/inline-files/MDL-880.pdf",
    status: "active",
  },
];

const insertCircular = db.prepare(
  "INSERT OR IGNORE INTO circulars (reference, title, date, category, summary, full_text, pdf_url, status) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
);
for (const c of circulars) {
  insertCircular.run(
    c.reference, c.title, c.date, c.category, c.summary, c.full_text, c.pdf_url, c.status,
  );
}
console.log(`Inserted ${circulars.length} supplementary standards (NAIC/Lloyd's)`);

// --- Summary ------------------------------------------------------------------

const fc = (db.prepare("SELECT COUNT(*) AS n FROM frameworks").get() as { n: number }).n;
const cc = (db.prepare("SELECT COUNT(*) AS n FROM controls").get() as { n: number }).n;
const circ = (db.prepare("SELECT COUNT(*) AS n FROM circulars").get() as { n: number }).n;

console.log(`
Database summary:
  Frameworks                        : ${fc}
  ICPs and Application Paper entries: ${cc}
  Supplementary standards           : ${circ}

Seed complete.`);
