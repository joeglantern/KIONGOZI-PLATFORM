import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

export type ExportFormat = 'pdf' | 'docx' | 'html' | 'txt' | 'md';

export interface ExportOptions {
  title?: string;
  author?: string;
  subject?: string;
}

// Convert HTML content to plain text
function htmlToPlainText(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
}

// Convert HTML to markdown (basic implementation)
function htmlToMarkdown(html: string): string {
  let markdown = html;
  
  // Headers
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
  
  // Bold and italic
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  
  // Lists
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gi, '$1\n');
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gi, '$1\n');
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  
  // Paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
  
  // Code blocks
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  
  // Links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]*>/g, '');
  
  // Clean up extra whitespace
  markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return markdown.trim();
}

// Parse HTML content for Word document structure
function parseHtmlForDocx(html: string): any[] {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const elements: any[] = [];
  
  function processNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        elements.push(new Paragraph({
          children: [new TextRun(text)]
        }));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      const textContent = element.textContent?.trim() || '';
      
      switch (tagName) {
        case 'h1':
          elements.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun(textContent)]
          }));
          break;
        case 'h2':
          elements.push(new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun(textContent)]
          }));
          break;
        case 'h3':
          elements.push(new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun(textContent)]
          }));
          break;
        case 'p':
          if (textContent) {
            const runs: TextRun[] = [];
            
            // Handle bold and italic within paragraphs
            element.childNodes.forEach(child => {
              if (child.nodeType === Node.TEXT_NODE) {
                runs.push(new TextRun(child.textContent || ''));
              } else if (child.nodeType === Node.ELEMENT_NODE) {
                const childElement = child as Element;
                const childText = childElement.textContent || '';
                
                if (childElement.tagName.toLowerCase() === 'strong' || childElement.tagName.toLowerCase() === 'b') {
                  runs.push(new TextRun({ text: childText, bold: true }));
                } else if (childElement.tagName.toLowerCase() === 'em' || childElement.tagName.toLowerCase() === 'i') {
                  runs.push(new TextRun({ text: childText, italics: true }));
                } else {
                  runs.push(new TextRun(childText));
                }
              }
            });
            
            elements.push(new Paragraph({ children: runs.length > 0 ? runs : [new TextRun(textContent)] }));
          }
          break;
        case 'br':
          elements.push(new Paragraph({ children: [new TextRun('')] }));
          break;
        default:
          // For other elements, process their children
          if (textContent) {
            element.childNodes.forEach(child => processNode(child));
          }
          break;
      }
    }
  }
  
  tempDiv.childNodes.forEach(node => processNode(node));
  return elements;
}

// Export content as PDF
export async function exportAsPDF(content: string, filename: string, options: ExportOptions = {}): Promise<void> {
  const pdf = new jsPDF();
  
  // Add metadata
  if (options.title) pdf.setProperties({ title: options.title });
  if (options.author) pdf.setProperties({ author: options.author });
  if (options.subject) pdf.setProperties({ subject: options.subject });
  
  // Create a temporary element to render the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '800px';
  tempDiv.style.padding = '20px';
  tempDiv.style.fontFamily = 'Arial, sans-serif';
  tempDiv.style.fontSize = '14px';
  tempDiv.style.lineHeight = '1.6';
  tempDiv.style.color = '#333';
  tempDiv.style.backgroundColor = '#fff';
  
  document.body.appendChild(tempDiv);
  
  try {
    const canvas = await html2canvas(tempDiv, {
      useCORS: true,
      scale: 2,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 190; // A4 width minus margins
    const pageHeight = 290; // A4 height minus margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 10;
    
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    // Add new pages if content is longer than one page
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(`${filename}.pdf`);
  } finally {
    document.body.removeChild(tempDiv);
  }
}

// Export content as Word document
export async function exportAsDocx(content: string, filename: string, options: ExportOptions = {}): Promise<void> {
  const elements = parseHtmlForDocx(content);
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: elements
    }],
    title: options.title,
    creator: options.author,
    subject: options.subject
  });
  
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

// Export content as HTML file
export function exportAsHTML(content: string, filename: string, options: ExportOptions = {}): void {
  const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title || filename}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 { color: #2c3e50; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
        code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
        blockquote { 
            border-left: 4px solid #3498db; 
            margin: 0; 
            padding-left: 20px; 
            color: #666; 
        }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
  
  const blob = new Blob([htmlTemplate], { type: 'text/html' });
  saveAs(blob, `${filename}.html`);
}

// Export content as plain text
export function exportAsText(content: string, filename: string): void {
  const plainText = htmlToPlainText(content);
  const blob = new Blob([plainText], { type: 'text/plain' });
  saveAs(blob, `${filename}.txt`);
}

// Export content as Markdown
export function exportAsMarkdown(content: string, filename: string): void {
  const markdown = htmlToMarkdown(content);
  const blob = new Blob([markdown], { type: 'text/markdown' });
  saveAs(blob, `${filename}.md`);
}

// Main export function
export async function exportDocument(
  content: string, 
  format: ExportFormat, 
  filename: string, 
  options: ExportOptions = {}
): Promise<void> {
  switch (format) {
    case 'pdf':
      await exportAsPDF(content, filename, options);
      break;
    case 'docx':
      await exportAsDocx(content, filename, options);
      break;
    case 'html':
      exportAsHTML(content, filename, options);
      break;
    case 'txt':
      exportAsText(content, filename);
      break;
    case 'md':
      exportAsMarkdown(content, filename);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}