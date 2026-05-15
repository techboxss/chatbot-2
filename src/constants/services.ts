
export interface ServiceFeature {
  title: string;
  description: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface ServiceDetail {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  iconName: string;
  keywords: string[];
  features: ServiceFeature[];
  benefits: string[];
  faqs: FAQ[];
  caseStudy: {
    title: string;
    description: string;
    result: string;
  };
  videoGenerationUrl?: string | null;
}

export const LEGAL_SERVICES: Record<string, ServiceDetail> = {
  COMPLIANCE: {
    id: 'COMPLIANCE',
    name: 'Regulatory Compliance & Risk Management',
    shortName: 'Compliance',
    tagline: 'Stay ahead of evolving global regulations.',
    description: 'Our compliance team provides comprehensive monitoring and implementation strategies for businesses operating in highly regulated sectors.',
    iconName: 'ShieldCheck',
    keywords: ['compliance', 'regulatory', 'gdpr', 'ccpa', 'sox', 'audit', 'policy', 'data privacy', 'hipaa', 'monitoring', 'oversight', 'framework'],
    features: [
      { title: 'Real-time regulatory tracking', description: 'Monitor global legislative changes and compliance shifts as they happen across jurisdictions.' },
      { title: 'Gap analysis & risk assessment', description: 'Deep-dive audits to identify discrepancies between your current operations and new legal requirements.' },
      { title: 'Policy drafting & implementation', description: 'Professional creation of internal guidelines and compliance manuals tailored to your specific industry.' },
      { title: 'Internal audit support', description: 'Preparation and execution of rigorous checks to ensure your team is always ready for external regulatory inspections.' }
    ],
    benefits: [
      'Avoid costly fines and penalties',
      'Build trust with stakeholders',
      'Streamline international expansion',
      'Reduce operational uncertainty',
      'Future-proof against legislative shifts',
      'Establish a culture of integrity'
    ],
    faqs: [
      { question: "How quickly can you implement a new compliance framework?", answer: "Typically, we can establish a baseline framework within 4-6 weeks, depending on the complexity of your jurisdictions." },
      { question: "Do you support cross-border compliance for GDPR and CCPA?", answer: "Yes, we specialize in harmonizing global data privacy standards into a single, unified operational manual." },
      { question: "What happens if a regulation changes mid-project?", answer: "Our real-time tracking system identifies changes immediately, allowing us to pivot the implementation strategy without significant delays." }
    ],
    caseStudy: {
      title: 'Global Fintech Expansion',
      description: 'A growing fintech startup needed to comply with diverse regulations across 12 European markets.',
      result: 'Achieved 100% compliance readiness in 4 months, enabling a successful $50M Series B round.'
    },
    videoGenerationUrl: null
  },
  INTELLECTUAL_PROPERTY: {
    id: 'INTELLECTUAL_PROPERTY',
    name: 'Intellectual Property Protection',
    shortName: 'IP Protection',
    tagline: 'Defending your ingenuity and brand equity.',
    description: 'We help innovators secure and monetize their intellectual assets through strategic filing and enforcement.',
    iconName: 'Lightbulb',
    keywords: ['intellectual property', 'patent', 'trademark', 'copyright', 'branding', 'ip portfolio', 'brand protection', 'infringement', 'licensing', 'r&d'],
    features: [
      { title: 'Global patent & trademark filing', description: 'Strategic securing of intellectual property rights in multiple worldwide jurisdictions simultaneously.' },
      { title: 'IP portfolio management', description: 'Comprehensive oversight and strategic optimization of your entire collection of intellectual assets.' },
      { title: 'Anti-counterfeiting strategies', description: 'Proactive legal and technological measures to detect and stop unauthorized usage of your brand.' },
      { title: 'Licensing agreements', description: 'Maximizing the commercial value of your IP through clear, protective, and profitable licensing terms.' }
    ],
    benefits: [
      'Protect competitive advantages',
      'Maximize asset valuation',
      'Create new revenue streams',
      'Deter market copycats',
      'Enforce market exclusivity',
      'Attract premium strategic partnerships'
    ],
    faqs: [
      { question: "Does your IP protection cover international markets?", answer: "Absolutely. We manage international filings through the PCT system and direct filings in over 150 countries." },
      { question: "How long does the trademark registration process take?", answer: "While government processing times vary, we typically complete the search and filing within 7-10 business days." },
      { question: "Can you help monetize existing IP portfolios?", answer: "Yes, we conduct valuation audits and develop licensing frameworks to transform your patents into revenue-generating assets." }
    ],
    caseStudy: {
      title: 'Saas Patent Strategy',
      description: 'An AI software company needed to protect its core algorithms from emerging competitors.',
      result: 'Secured 5 key utility patents, increasing company valuation by an estimated 25%.'
    },
    videoGenerationUrl: null
  },
  CORPORATE_GOVERNANCE: {
    id: 'CORPORATE_GOVERNANCE',
    name: 'Corporate Governance & Structuring',
    shortName: 'Governance',
    tagline: 'Foundations for sustainable business growth.',
    description: 'Structuring your business for transparency, efficiency, and scalability from the boardroom to the baseline.',
    iconName: 'Building',
    keywords: ['governance', 'restructuring', 'incorporation', 'm&a', 'merger', 'acquisition', 'board', 'entity formation', 'shareholder', 'secretary'],
    features: [
      { title: 'Entity formation & restructuring', description: 'Seamless legal setup for new business units and strategic reorganizations for growth.' },
      { title: 'Board advisory services', description: 'High-level legal guidance for corporate directors on fiduciary duties and governance best practices.' },
      { title: 'Mergers & Acquisitions (M&A) support', description: 'End-to-level legal due diligence, drafting, and integration strategy for complex corporate transactions.' },
      { title: 'Shareholder agreement drafting', description: 'Defining rights, responsibilities, and exit strategies with ironclad legal frameworks.' }
    ],
    benefits: [
      'Attract high-tier investors',
      'Ensure smooth ownership transitions',
      'Mitigate internal disputes',
      'Optimize tax efficiency',
      'Shorten due diligence cycles',
      'Stabilize long-term leadership continuity'
    ],
    faqs: [
      { question: "What is included in a board advisory session?", answer: "We provide briefings on recent regulatory shifts, fiduciary duty training, and assistance with minutes and resolutions." },
      { question: "Can you help with entity restructuring for tax optimization?", answer: "We work alongside your tax advisors to ensure the legal implementation of tax-efficient corporate structures." },
      { question: "How do you manage M&A due diligence efficiently?", answer: "We utilize AI extraction tools to review thousands of legacy documents, focusing our expert review on high-risk deal breakers." }
    ],
    caseStudy: {
      title: 'Complex Multi-Entity Merger',
      description: 'Two regional manufacturing leaders required a seamless integration of operations and legal structures.',
      result: 'Completed merger 2 months ahead of schedule with zero litigation files.'
    },
    videoGenerationUrl: null
  },
  LITIGATION_SUPPORT: {
    id: 'LITIGATION_SUPPORT',
    name: 'Litigation Support & Dispute Resolution',
    shortName: 'Litigation',
    tagline: 'Strategic advocacy when conflicts arise.',
    description: 'Providing the analytical and tactical support needed to navigate complex commercial disputes effectively.',
    iconName: 'Scale',
    keywords: ['litigation', 'dispute', 'arbitration', 'e-discovery', 'deposition', 'doc review', 'court', 'trial', 'evidence', 'discovery'],
    features: [
      { title: 'E-Discovery & data management', description: 'AI-driven processing of massive datasets to identify critical evidence with surgical precision.' },
      { title: 'Expert witness coordination', description: 'Identifying, vetting, and managing industry-specific experts to provide compelling testimony.' },
      { title: 'Arbitration & Mediation support', description: 'Navigating alternative dispute resolution protocols to reach favorable outcomes outside of court.' },
      { title: 'Strategic settlement advisory', description: 'Data-backed risk analysis to determine the optimal timing and terms for closing disputes.' }
    ],
    benefits: [
      'Reduce litigation costs',
      'Accelerate time-to-resolution',
      'Maintain business continuity',
      'Protect public reputation',
      'Leverage data-driven negotiation leverage',
      'Isolate legal risk from core operations'
    ],
    faqs: [
      { question: "How do you handle massive volumes of E-Discovery data?", answer: "We employ advanced Technology Assisted Review (TAR) to categorize and prioritize documents, reducing human review hours by up to 70%." },
      { question: "Is arbitration always faster than traditional litigation?", answer: "Generally yes, but it depends on the complexity of the agreement. We help you choose the path that best preserves your business interests." },
      { question: "Can you provide risk analysis for potential settlements?", answer: "Yes, we use historical case data and probabilistic modeling to provide a clear 'expected value' for settlement offers." }
    ],
    caseStudy: {
      title: 'Supply Chain Breach Defense',
      description: 'A major retailer faced a class-action lawsuit following a tiered supply chain disruption.',
      result: 'Negotiated a favorable settlement at 30% of the initial claim value.'
    },
    videoGenerationUrl: null
  },
  CONTRACT_SOLUTIONS: {
    id: 'CONTRACT_SOLUTIONS',
    name: 'Contract Solutions & Lifecycle Management',
    shortName: 'Contracts',
    tagline: 'Precision drafting and high-velocity review.',
    description: 'We optimize your contract workflows using AI-driven analysis coupled with attorney-led strategic review.',
    iconName: 'FileText',
    keywords: ['contract', 'agreement', 'redline', 'clm', 'vendor review', 'drafting', 'msa', 'sow', 'nda', 'agreement templates'],
    features: [
      { title: 'AI-powered risk identification', description: 'Rapid scanning of thousands of pages to highlight high-risk clauses and non-standard terms.' },
      { title: 'Standardized redlining', description: 'Accelerating negotiations using pre-approved playbooks and automated redline suggestions.' },
      { title: 'Clause library development', description: 'Building a centralized repository of golden-standard legal language for consistent drafting.' },
      { title: 'High-volume vendor review', description: 'Efficient processing of incoming third-party agreements without sacrificing strategic depth.' }
    ],
    benefits: [
      'Reduce drafting time by 60%',
      'Eliminate contractual oversight',
      'Standardize legal positions',
      'Accelerate revenue recognition',
      'Scale operations without headcount increases',
      'Secure favorable commercial terms consistently'
    ],
    faqs: [
      { question: "Can your AI review custom vendor agreements?", answer: "Yes, our models are trained to identify risk profiles regardless of the document format, using your specific legal playbooks as a guide." },
      { question: "Do you integrate with CLM platforms like Ironclad or Conga?", answer: "We are platform-agnostic and can provide legal engineering support to optimize your existing CLM implementation." },
      { question: "How do you handle urgent, high-volume contract batches?", answer: "We maintain a 'burst capacity' team supported by AI to handle end-of-quarter or M&A-driven surges in volume." }
    ],
    caseStudy: {
      title: 'Enterprise Vendor Consolidation',
      description: 'A global tech firm needed to review 5,000+ legacy vendor contracts for renewal risk.',
      result: 'Completed review in 3 weeks instead of 6 months, identifying $2.1M in savings.'
    },
    videoGenerationUrl: null
  },
  LEGAL_OPS: {
    id: 'LEGAL_OPS',
    name: 'Legal Operations (LegalOps)',
    shortName: 'LegalOps',
    tagline: 'Optimize your legal team for peak performance.',
    description: 'We help corporate legal departments and law firms scale through process optimization, technology implementation, and data-driven insights.',
    iconName: 'Settings',
    keywords: ['legal ops', 'legal operations', 'legalops', 'departmental metrics', 'spend analytics', 'capacity planning', 'e-billing', 'resource allocation'],
    features: [
      { title: 'Workflow & automation design', description: 'Analyzing and redesigning legal processes to eliminate manual bottlenecks and friction.' },
      { title: 'Legal tech stack implementation', description: 'Expert selection and deployment of CLM, ELM, and other critical legal technology solutions.' },
      { title: 'Departmental metrics & KPIs', description: 'Defining and tracking objective data points to measure the value and efficiency of legal operations.' },
      { title: 'Vendor management & spend analysis', description: 'Granular tracking and optimization of external legal spend across multiple firms and vendors.' }
    ],
    benefits: [
      'Reduce external legal spend',
      'Increase team productivity by 30%+',
      'Drive better decision making with data',
      'Accelerate contract turnaround times',
      'Transform legal into a strategic business partner',
      'Quantify legal\'s ROI for the board'
    ],
    faqs: [
      { question: "What is the first step in a LegalOps transformation?", answer: "We begin with a 'State of the Department' audit to map existing workflows and identify the highest-impact friction points." },
      { question: "How do you measure the ROI of legal operations?", answer: "We track metrics such as internal time-to-close, outside counsel cost reduction, and budget predictability." },
      { question: "Can you help selection the right legal technology?", answer: "Yes, we provide objective 'Buy vs. Build' analysis and manage the RFI/RFP process for legal tech vendors." }
    ],
    caseStudy: {
      title: 'Fortune 500 Legal Transformation',
      description: 'A global enterprise needed to modernize its fragmented legal operations across multiple jurisdictions.',
      result: 'Reduced outside counsel spend by 18% in the first year through automated billing and vendor management.'
    },
    videoGenerationUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
  },
  LEGAL_OPS_AUTOMATION: {
    id: 'LEGAL_OPS_AUTOMATION',
    name: 'Legal Operations Automation',
    shortName: 'Ops Automation',
    tagline: 'Transform your legal department into a high-efficiency powerhouse.',
    description: 'Modernize your legal operations with end-to-to automation, strategic technology integration, and data-driven performance management.',
    iconName: 'Cpu',
    keywords: ['automation', 'tech stack', 'workflow design', 'ops automation', 'elm', 'matter management', 'process optimization', 'digitized workflow'],
    features: [
      { title: 'Custom Workflow & Automation Design', description: 'End-to-end digitization of legal handoffs, approvals, and repeat tasks for maximum velocity.' },
      { title: 'Legal Tech Stack Implementation', description: 'Deploying advanced CLM and ELM tools with deep integration into your existing business systems.' },
      { title: 'Advanced KPI Dashboards', description: 'Real-time visibility into department health through custom-built data visualization boards.' },
      { title: 'Automated Spend Analysis', description: 'Using AI to automatically flag billing errors and optimize outside counsel resource allocation.' }
    ],
    benefits: [
      'Achieve 40%+ Increase in Team Productivity',
      'Drastically Reduce Outside Counsel Spend',
      'Eliminate Bottlenecks with Real-time Visibility',
      'Future-proof Your Legal Infrastructure',
      'Recapture thousands of high-value attorney hours',
      'Deliver frictionless legal services to the business'
    ],
    faqs: [
      { question: "Can you automate complex legal handoffs between departments?", answer: "Yes, we design cross-functional workflows that connect Legal with Sales, HR, and Procurement seamlessly." },
      { question: "Does automation replace the need for in-house counsel?", answer: "No, it empowers them by removing low-value administrative tasks, allowing your attorneys to focus on high-value strategic work." },
      { question: "How secure is the automation infrastructure?", answer: "We implement SOC2-compliant integrations and ensure all data remains within your company's secure cloud environment." }
    ],
    caseStudy: {
      title: 'Global Tech Leader\'s Legal Overhaul',
      description: 'A Silicon Valley unicorn was struggling with manual contract approvals and unmanaged legal spend across global offices.',
      result: 'Implemented a custom CLM and automated billing system, reducing contract turnaround time by 55% and saving $4.2M in annual spend.'
    },
    videoGenerationUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  }
};
