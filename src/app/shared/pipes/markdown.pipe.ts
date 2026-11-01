import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Marked } from 'marked';

@Pipe({
  name: 'markdown',
  standalone: true,
})
export class MarkdownPipe implements PipeTransform {
  private marked: Marked;

  constructor(private sanitizer: DomSanitizer) {
    this.marked = new Marked({
      gfm: true,
      breaks: false,
    });
  }

  transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return '';
    }

    const rawHtml = this.marked.parse(value) as string;

    // Sanitize: strip script tags, event handlers, and dangerous elements
    const sanitized = this.sanitizeHtml(rawHtml);

    return this.sanitizer.bypassSecurityTrustHtml(sanitized);
  }

  private sanitizeHtml(html: string): string {
    // Remove script tags
    let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // Remove on* event handlers
    clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    // Remove javascript: URLs
    clean = clean.replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '');
    // Remove iframe, object, embed, form
    clean = clean.replace(/<\/?(?:iframe|object|embed|form)\b[^>]*>/gi, '');
    return clean;
  }
}
