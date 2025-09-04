// Artifact system type definitions

export type ArtifactType = 
  | 'html'
  | 'css'
  | 'javascript'
  | 'python'
  | 'json'
  | 'markdown'
  | 'text'
  | 'svg'
  | 'react'
  | 'csv'
  | 'sql'
  | 'bash'
  | 'document'
  | 'richtext';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  metadata?: {
    language?: string;
    framework?: string;
    dependencies?: string[];
    tags?: string[];
    exports?: {
      formats: string[];
      lastExported?: Date;
    };
  };
}

export interface ArtifactDetection {
  shouldCreateArtifact: boolean;
  type: ArtifactType;
  title: string;
  description?: string;
  confidence: number;
}

export interface ArtifactVersion {
  id: string;
  version: number;
  content: string;
  timestamp: Date;
  changes: string;
}

export interface ArtifactExportOptions {
  format: 'txt' | 'md' | 'html' | 'pdf' | 'docx' | 'png' | 'json';
  filename?: string;
  includeMetadata?: boolean;
}

export interface StreamingArtifact {
  artifact: Artifact;
  streamingContent: string;
  isComplete: boolean;
}

// Artifact creation criteria (based on Claude's official specs)
export const ARTIFACT_CRITERIA = {
  MIN_LINES: 15,
  MIN_CHARS: 150,
  SUBSTANTIAL_TYPES: ['html', 'css', 'javascript', 'python', 'react', 'document', 'markdown', 'sql'],
  REQUIRES_EDITING: true, // Content user likely wants to edit/iterate on
  SELF_CONTAINED: true    // Should work without conversation context
} as const;

// Artifact trigger patterns (based on user intent and content analysis)
export const ARTIFACT_TRIGGERS = {
  code: [
    /```[\s\S]*```/,
    /(?:create|build|write|generate|make).*(?:component|function|class|script|program|code)/i,
    /(?:build|create|make).*(?:app|website|tool|calculator|game)/i,
    /(?:implement|code|program).*(?:feature|functionality|logic)/i
  ],
  document: [
    /(?:write|create|draft|generate|compose|make).*(?:document|report|essay|article|letter|proposal|guide|manual|tutorial)/i,
    /(?:draft|write).*(?:content|text|copy)/i,
    /(?:create|make).*(?:documentation|readme|instructions)/i,
    /(?:write|create).*(?:\d+\s*(?:words|paragraphs|pages))/i
  ],
  html: [
    /(?:create|build|make).*(?:webpage|html|website|landing.?page|site)/i,
    /(?:build|create|design).*(?:ui|interface|layout|page)/i,
    /<html|<!DOCTYPE/i,
    /(?:create|make).*(?:form|dashboard|widget)/i
  ],
  visualization: [
    /(?:create|build|make|generate).*(?:chart|graph|plot|visualization|dashboard)/i,
    /(?:visualize|plot|chart|graph).*(?:data|statistics|analytics)/i,
    /(?:create|build).*(?:infographic|diagram|flowchart)/i
  ],
  data: [
    /(?:create|generate|make).*(?:dataset|csv|json|database|table)/i,
    /(?:structure|format|organize).*(?:data|information)/i,
    /(?:export|convert|transform).*(?:data|format)/i
  ]
} as const;

// Language detection for syntax highlighting
export const LANGUAGE_DETECTION = {
  javascript: /(?:\.js|\.jsx|\.ts|\.tsx|javascript|typescript|react|node)/i,
  python: /(?:\.py|\.pyw|python|django|flask)/i,
  html: /(?:\.html|\.htm|html|webpage)/i,
  css: /(?:\.css|\.scss|\.sass|css|stylesheet)/i,
  json: /(?:\.json|json|config|package)/i,
  sql: /(?:\.sql|sql|database|query|mysql|postgres)/i,
  bash: /(?:\.sh|\.bash|bash|shell|terminal|command)/i,
  markdown: /(?:\.md|\.markdown|markdown|readme)/i
} as const;

// Export format configurations
export const EXPORT_FORMATS = {
  txt: { extension: 'txt', mimeType: 'text/plain', name: 'Plain Text' },
  md: { extension: 'md', mimeType: 'text/markdown', name: 'Markdown' },
  html: { extension: 'html', mimeType: 'text/html', name: 'HTML' },
  json: { extension: 'json', mimeType: 'application/json', name: 'JSON' },
  pdf: { extension: 'pdf', mimeType: 'application/pdf', name: 'PDF' },
  docx: { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'Word Document' },
  png: { extension: 'png', mimeType: 'image/png', name: 'PNG Image' }
} as const;