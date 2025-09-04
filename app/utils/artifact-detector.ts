import { 
  ArtifactType, 
  Artifact,
  ArtifactDetection, 
  ARTIFACT_CRITERIA,
  LANGUAGE_DETECTION
} from '../components/artifacts/types';

/**
 * Detect document artifacts following ChatGPT Canvas style:
 * 1. Content is substantial (>15 lines) AND self-contained
 * 2. User likely wants to edit, iterate, or reuse it  
 * 3. Represents substantial documents (reports, articles, letters, etc.)
 * 4. Stands alone without requiring conversation context
 * 5. ONLY for documents - no code artifacts
 */
export function detectArtifacts(
  text: string, 
  messageId: string,
  userPrompt?: string
): ArtifactDetection {
  const artifacts: Artifact[] = [];
  let shouldCreateArtifact = false;
  let primaryType: ArtifactType = 'text';
  let confidence = 0;
  let title = '';
  let description = '';

  // Step 1: Check for explicit code blocks first
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let blockIndex = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = match[1]?.toLowerCase() || '';
    const content = match[2].trim();
    
    // Apply Claude's criteria: >15 lines AND substantial
    const lineCount = content.split('\n').length;
    const charCount = content.length;
    
    if (lineCount >= ARTIFACT_CRITERIA.MIN_LINES && charCount >= ARTIFACT_CRITERIA.MIN_CHARS) {
      // Determine artifact type based on language hint or content analysis
      let artifactType: ArtifactType;
      
      if (language === 'document' || language === 'richtext') {
        artifactType = language as ArtifactType;
      } else if (language === 'html' && isDocumentContent(content)) {
        // Check if HTML is actually document content
        artifactType = 'document';
      } else if (language) {
        artifactType = mapLanguageToType(language);
      } else {
        artifactType = analyzeContentType(content);
      }
      
      const artifact: Artifact = {
        id: `${messageId}-artifact-${blockIndex}`,
        type: artifactType,
        title: generateArtifactTitle(content, artifactType, userPrompt),
        content,
        description: `Generated ${artifactType === 'document' ? 'document' : 'code'} content`,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        metadata: {
          language: language || artifactType,
          tags: extractTags(content, artifactType),
          exports: {
            formats: getSupportedFormats(artifactType)
          }
        }
      };
      
      artifacts.push(artifact);
      
      if (blockIndex === 0) {
        shouldCreateArtifact = true;
        primaryType = artifactType;
        title = artifact.title;
        description = artifact.description || '';
        confidence = 0.95; // High confidence for explicit code blocks
      }
      
      blockIndex++;
    }
  }

  // Step 2: Check for substantial content without explicit code blocks
  if (!shouldCreateArtifact) {
    const analysis = analyzeTextForArtifacts(text, userPrompt);
    
    if (analysis.isArtifactWorthy) {
      shouldCreateArtifact = true;
      primaryType = analysis.type;
      title = analysis.title;
      description = analysis.description;
      confidence = analysis.confidence;
      
      // Create artifact for the entire content
      const artifact: Artifact = {
        id: `${messageId}-artifact-0`,
        type: analysis.type,
        title: analysis.title,
        content: text.trim(),
        description: analysis.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        metadata: {
          tags: extractTags(text, analysis.type),
          exports: {
            formats: getSupportedFormats(analysis.type)
          }
        }
      };
      
      artifacts.push(artifact);
    }
  }

  return {
    shouldCreateArtifact,
    type: primaryType,
    title,
    description,
    confidence
  };
}

/**
 * Analyze text content to determine if it should be an artifact
 */
function analyzeTextForArtifacts(text: string, userPrompt?: string): {
  isArtifactWorthy: boolean;
  type: ArtifactType;
  title: string;
  description: string;
  confidence: number;
} {
  const lines = text.split('\n');
  const lineCount = lines.length;
  const charCount = text.length;
  
  // Must meet basic size requirements
  if (lineCount < ARTIFACT_CRITERIA.MIN_LINES || charCount < ARTIFACT_CRITERIA.MIN_CHARS) {
    return {
      isArtifactWorthy: false,
      type: 'text',
      title: '',
      description: '',
      confidence: 0
    };
  }

  // Don't create artifacts for terminal commands
  if (hasTerminalCommands(text)) {
    return {
      isArtifactWorthy: false,
      type: 'text',
      title: '',
      description: '',
      confidence: 0
    };
  }

  // Don't create artifacts for mixed explanatory content
  if (hasMixedExplanatoryContent(text)) {
    return {
      isArtifactWorthy: false,
      type: 'text',
      title: '',
      description: '',
      confidence: 0
    };
  }

  let confidence = 0;
  let detectedType: ArtifactType = 'text';
  
  // Check user intent from prompt
  if (userPrompt) {
    const intentAnalysis = analyzeUserIntent(userPrompt);
    if (intentAnalysis.isCreationIntent) {
      confidence += 0.4;
      detectedType = intentAnalysis.intendedType;
    }
  }

  // Analyze content patterns
  const contentAnalysis = analyzeContentType(text);
  if (contentAnalysis !== 'text') {
    detectedType = contentAnalysis;
    confidence += 0.3;
  }

  // Check for document structure
  if (hasDocumentStructure(text)) {
    detectedType = 'document';
    confidence += 0.4;
  }

  // Check for code patterns
  const codeConfidence = analyzeCodePatterns(text);
  if (codeConfidence.confidence > 0.3) {
    detectedType = codeConfidence.type;
    confidence += codeConfidence.confidence;
  }

  // Must be substantial and likely to be edited/reused
  const isSubstantial = lineCount >= 20 || charCount >= 300;
  const hasStructure = text.includes('\n\n') || hasFormatting(text);
  
  if (isSubstantial && hasStructure) {
    confidence += 0.2;
  }

  const isArtifactWorthy = confidence >= 0.6;
  
  return {
    isArtifactWorthy,
    type: detectedType,
    title: generateArtifactTitle(text, detectedType, userPrompt),
    description: generateDescription(detectedType, text),
    confidence: Math.min(confidence, 1.0)
  };
}

/**
 * Check if HTML content is actually document content
 */
function isDocumentContent(content: string): boolean {
  // Document indicators
  const documentTags = /<(h[1-6]|p|div|strong|em|ul|ol|li|blockquote|article|section)[^>]*>/gi;
  const documentMatches = (content.match(documentTags) || []).length;
  
  // Code indicators  
  const codeTags = /<(html|head|body|meta|link|script|style|nav|header|footer)[^>]*>/gi;
  const codeMatches = (content.match(codeTags) || []).length;
  
  // Complex attributes indicate code
  const complexAttributes = /\s(class|id|onclick|onload|style)=["'][^"']*["']/gi;
  const complexMatches = (content.match(complexAttributes) || []).length;
  
  // If more document tags than code tags and no complex scripting
  return documentMatches > codeMatches && complexMatches < 3;
}

/**
 * Map language hint to artifact type
 */
function mapLanguageToType(language: string): ArtifactType {
  const languageMap: Record<string, ArtifactType> = {
    'html': 'html',
    'css': 'css',
    'js': 'javascript',
    'javascript': 'javascript',
    'jsx': 'react',
    'tsx': 'react',
    'react': 'react',
    'python': 'python',
    'py': 'python',
    'json': 'json',
    'svg': 'svg',
    'sql': 'sql',
    'bash': 'bash',
    'sh': 'bash',
    'shell': 'bash',
    'csv': 'csv',
    'md': 'markdown',
    'markdown': 'markdown',
    'document': 'document',
    'richtext': 'richtext',
    'doc': 'document'
  };
  
  return languageMap[language] || 'text';
}

/**
 * Analyze content to determine type based on patterns
 */
function analyzeContentType(content: string): ArtifactType {
  // Test each type's patterns
  const typeScores: Record<ArtifactType, number> = {
    html: 0, css: 0, javascript: 0, python: 0, json: 0,
    svg: 0, react: 0, sql: 0, bash: 0, csv: 0, 
    markdown: 0, text: 0, document: 0, richtext: 0
  };

  // HTML patterns
  if (/<\s*[a-zA-Z][^>]*>/.test(content)) typeScores.html += 2;
  if (/<!DOCTYPE/i.test(content)) typeScores.html += 3;
  
  // CSS patterns
  if (/\{[^}]*[a-z-]+\s*:\s*[^;}]+;?[^}]*\}/i.test(content)) typeScores.css += 3;
  if (/@(media|import|keyframes)/i.test(content)) typeScores.css += 2;
  
  // JavaScript patterns
  if (/\b(function|const|let|var|class|=>\s*{)\b/.test(content)) typeScores.javascript += 2;
  if (/console\.(log|error)/.test(content)) typeScores.javascript += 1;
  
  // React patterns
  if (/import\s+.*\s+from\s+['"]react['"]/.test(content)) typeScores.react += 3;
  if (/<[A-Z]\w*[^>]*>/.test(content)) typeScores.react += 2;
  if (/useState|useEffect/.test(content)) typeScores.react += 2;
  
  // Python patterns
  if (/\b(def|class|import|from)\b/.test(content)) typeScores.python += 2;
  if (/print\s*\(/.test(content)) typeScores.python += 1;
  
  // JSON patterns
  if (/^\s*[\{\[][\s\S]*[\}\]]\s*$/.test(content.trim())) {
    try {
      JSON.parse(content.trim());
      typeScores.json += 5;
    } catch {
      typeScores.json += 1;
    }
  }
  
  // SQL patterns
  if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE)\b.*\b(FROM|INTO|SET|TABLE)\b/i.test(content)) {
    typeScores.sql += 3;
  }
  
  // Markdown patterns
  if (/^#{1,6}\s+/m.test(content)) typeScores.markdown += 2;
  if (/\*\*[^*]+\*\*|\*[^*]+\*/.test(content)) typeScores.markdown += 1;
  if (/```[\s\S]*?```/.test(content)) typeScores.markdown += 2;
  
  // Find highest scoring type
  const bestType = Object.entries(typeScores).reduce((best, [type, score]) => 
    score > best.score ? { type: type as ArtifactType, score } : best,
    { type: 'text' as ArtifactType, score: 0 }
  );
  
  return bestType.score > 0 ? bestType.type : 'text';
}

/**
 * Check if content contains terminal commands that should NOT be artifacts
 */
function hasTerminalCommands(content: string): boolean {
  const terminalPatterns = [
    /^\s*npm\s+(install|run|start|build|test)/m,
    /^\s*pip\s+(install|upgrade|uninstall)/m,
    /^\s*yarn\s+(add|install|start|build)/m,
    /^\s*(ls|cd|mkdir|rm|cp|mv)\s+/m,
    /^\s*git\s+(clone|add|commit|push|pull)/m,
    /^\s*sudo\s+/m,
    /^\s*brew\s+(install|update)/m,
    /^\s*apt\s+(get|install|update)/m,
    /^\s*curl\s+-/m,
    /^\s*wget\s+/m
  ];
  
  return terminalPatterns.some(pattern => pattern.test(content));
}

/**
 * Check if content has mixed explanatory text that should NOT be in artifacts
 */
function hasMixedExplanatoryContent(content: string): boolean {
  const explanatoryPatterns = [
    /^(To\s+|Here\s+are\s+|The\s+following\s+|These\s+are\s+)/i,
    /^\d+\.\s+\*\*.*?\*\*:/m, // Numbered lists with bold features
    /^(Features?|Enhancement|Improvement|Addition)s?\s*:/im,
    /Here'?s\s+(the|an?)\s+(updated|enhanced|improved)/i,
    /^The\s+code\s+(includes|incorporates|features)/im,
    /^This\s+(function|script|code)\s+(will|can|does)/im
  ];
  
  const lines = content.split('\n');
  const nonCodeLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('#') && !trimmed.startsWith('/*');
  });
  
  // If more than 30% of non-code lines are explanatory, it's mixed content
  const explanatoryCount = nonCodeLines.filter(line => 
    explanatoryPatterns.some(pattern => pattern.test(line.trim()))
  ).length;
  
  return (explanatoryCount / Math.max(nonCodeLines.length, 1)) > 0.3;
}

/**
 * Analyze user intent from prompt
 */
function analyzeUserIntent(prompt: string): {
  isCreationIntent: boolean;
  intendedType: ArtifactType;
} {
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for creation keywords
  const creationKeywords = [
    'create', 'write', 'generate', 'build', 'make', 'design', 
    'implement', 'develop', 'code', 'draft', 'compose'
  ];
  
  const hasCreationIntent = creationKeywords.some(keyword => 
    lowerPrompt.includes(keyword)
  );
  
  if (!hasCreationIntent) {
    return { isCreationIntent: false, intendedType: 'text' };
  }

  // Don't create artifacts for terminal/installation commands
  if (/(install|command|terminal|run|execute)/.test(lowerPrompt) && 
      /(npm|pip|yarn|git|brew|apt)/.test(lowerPrompt)) {
    return { isCreationIntent: false, intendedType: 'text' };
  }
  
  // Determine intended type based on context
  let intendedType: ArtifactType = 'text';
  
  if (/(document|report|essay|article|letter|proposal|guide|manual)/.test(lowerPrompt)) {
    intendedType = 'document';
  } else if (/(webpage|html|website|landing.?page)/.test(lowerPrompt)) {
    intendedType = 'html';
  } else if (/(component|react|jsx)/.test(lowerPrompt)) {
    intendedType = 'react';
  } else if (/(css|style|stylesheet)/.test(lowerPrompt)) {
    intendedType = 'css';
  } else if (/(javascript|js|script)/.test(lowerPrompt)) {
    intendedType = 'javascript';
  } else if (/python/.test(lowerPrompt)) {
    intendedType = 'python';
  } else if (/(json|data|config)/.test(lowerPrompt)) {
    intendedType = 'json';
  } else if (/(sql|query|database)/.test(lowerPrompt)) {
    intendedType = 'sql';
  } else if (/(markdown|md|documentation)/.test(lowerPrompt)) {
    intendedType = 'markdown';
  }
  
  return { isCreationIntent: true, intendedType };
}

/**
 * Check if content has document structure
 */
function hasDocumentStructure(content: string): boolean {
  // Check for document-like patterns
  const hasHeadings = /<h[1-6]|^#{1,6}\s+/m.test(content);
  const hasParagraphs = /<p>|^\s*[A-Z].*\.\s*$/m.test(content);
  const hasLists = /<[uo]l>|^\s*[-*+]\s+|^\s*\d+\.\s+/m.test(content);
  const hasFormatting = /<(strong|em|b|i)>|\*\*.*?\*\*|\*.*?\*/i.test(content);
  
  return (hasHeadings && hasParagraphs) || (hasLists && hasFormatting);
}

/**
 * Check if content has formatting
 */
function hasFormatting(content: string): boolean {
  return (
    content.includes('\n\n') || // Paragraphs
    /<[^>]+>/.test(content) || // HTML tags
    /\*\*.*?\*\*|\*.*?\*/.test(content) || // Markdown formatting
    /^#{1,6}\s+/m.test(content) || // Headers
    /^\s*[-*+]\s+/m.test(content) // Lists
  );
}

/**
 * Analyze code patterns in content
 */
function analyzeCodePatterns(content: string): {
  type: ArtifactType;
  confidence: number;
} {
  let maxConfidence = 0;
  let bestType: ArtifactType = 'text';
  
  // Test each programming language
  Object.entries(LANGUAGE_DETECTION).forEach(([lang, pattern]) => {
    if (pattern.test(content)) {
      const confidence = 0.4;
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        bestType = lang as ArtifactType;
      }
    }
  });
  
  return { type: bestType, confidence: maxConfidence };
}

/**
 * Generate appropriate title for artifact
 */
function generateArtifactTitle(content: string, type: ArtifactType, userPrompt?: string): string {
  // Try to extract from user prompt first
  if (userPrompt) {
    const promptMatch = userPrompt.match(/(?:create|write|build|make)\s+(?:a\s+)?(.+?)(?:\s+(?:for|that|which|to))/i);
    if (promptMatch && promptMatch[1].length < 50) {
      return promptMatch[1].trim();
    }
  }
  
  // Try to extract from content
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim() || '';
  
  // Extract from HTML title or headings
  if (type === 'html' || type === 'document') {
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) return titleMatch[1].trim();
    
    const headingMatch = content.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    if (headingMatch) return headingMatch[1].replace(/<[^>]*>/g, '').trim();
    
    const mdHeadingMatch = content.match(/^#{1,6}\s+(.*)/m);
    if (mdHeadingMatch) return mdHeadingMatch[1].trim();
  }
  
  // Extract from function/class names
  if (type === 'javascript' || type === 'python' || type === 'react') {
    const funcMatch = content.match(/(?:function|def|class|const)\s+(\w+)/);
    if (funcMatch) return `${funcMatch[1]} ${type === 'react' ? 'Component' : 'Function'}`;
  }
  
  // Extract from comments
  const commentMatch = firstLine.match(/(?:\/\/|#|\/\*|\<!--)\s*(.+)/);
  if (commentMatch && commentMatch[1].length < 50) {
    return commentMatch[1].replace(/\*\/|\-->/, '').trim();
  }
  
  // Default titles
  const defaultTitles: Record<ArtifactType, string> = {
    html: 'HTML Page',
    css: 'CSS Styles', 
    javascript: 'JavaScript Code',
    python: 'Python Script',
    json: 'JSON Data',
    svg: 'SVG Graphic',
    react: 'React Component',
    sql: 'SQL Query',
    bash: 'Shell Script',
    csv: 'CSV Data',
    markdown: 'Markdown Document',
    text: 'Text Content',
    document: 'Document',
    richtext: 'Rich Text Document'
  };
  
  return defaultTitles[type] || 'Artifact';
}

/**
 * Generate description for artifact
 */
function generateDescription(type: ArtifactType, content: string): string {
  const lineCount = content.split('\n').length;
  
  if (type === 'document' || type === 'richtext') {
    return `Document with ${lineCount} lines`;
  } else {
    return `${type.toUpperCase()} code with ${lineCount} lines`;
  }
}

/**
 * Extract relevant tags from content
 */
function extractTags(content: string, type: ArtifactType): string[] {
  const tags: string[] = [type];
  
  // Add framework/library tags
  if (content.includes('react')) tags.push('react');
  if (content.includes('vue')) tags.push('vue');
  if (content.includes('angular')) tags.push('angular');
  if (content.includes('bootstrap')) tags.push('bootstrap');
  if (content.includes('tailwind')) tags.push('tailwindcss');
  
  return tags;
}

/**
 * Get supported export formats for artifact type
 */
function getSupportedFormats(type: ArtifactType): string[] {
  const formatMap: Record<ArtifactType, string[]> = {
    html: ['html', 'txt', 'pdf', 'png'],
    css: ['css', 'txt'],
    javascript: ['js', 'txt'],
    python: ['py', 'txt'],
    json: ['json', 'txt'],
    svg: ['svg', 'png', 'pdf'],
    react: ['jsx', 'txt'],
    sql: ['sql', 'txt'],
    bash: ['sh', 'txt'],
    csv: ['csv', 'txt'],
    markdown: ['md', 'html', 'pdf', 'txt'],
    document: ['html', 'pdf', 'docx', 'md', 'txt'],
    richtext: ['html', 'pdf', 'docx', 'txt'],
    text: ['txt']
  };
  
  return formatMap[type] || ['txt'];
}