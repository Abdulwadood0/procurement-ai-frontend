import {
  Component,
  signal,
  inject,
  computed,
  ElementRef,
  viewChild,
  HostListener,
} from '@angular/core';
import { ChatService } from '../../services/chat';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  query?: any;
  pipeline?: any;
  showDetails?: boolean;
}

@Component({
  selector: 'app-chat',
  imports: [MarkdownPipe],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat {
  private chatService = inject(ChatService);

  threadId = signal<string | null>(null);
  messages = signal<ChatMessage[]>([]);

  inputValue = signal('');

  isLoading = signal(false);

  /** Theme mode state */
  isDarkMode = signal(true);

  /** True when streaming has started (first token received). */
  isStreaming = signal(false);

  /** Index of message whose query was recently copied */
  copiedIndex = signal<number | null>(null);

  /** Whether the ready-to-send questions panel is open */
  showReadyQuestions = signal(false);

  /** Ready-to-send questions list */
  readonly readyQuestions: readonly string[] = [
    'What is the total spending in Q1 2014',
    'How many orders were created in July 2013?',
    'Which quarter had the highest total spending?',
    'What are the top 5 suppliers by total spend?',
    'What is the average purchase order value?',
    'Which supplier has the most orders?',
    'How many orders were for it goods?',
    'How many orders used the Master Service Agreement method?',
    'How many orders have a unit price greater than $1000?',
    'For fiscal year 2014-2015, which department spent the most on IT Goods?',
    'What are the top 5 most frequently ordered items by the Department of Corrections and Rehabilitation?',
    'Which quarter in 2013 had the highest total spending on NON-IT Goods?',
    'Compare total spending between IT Goods and NON-IT Goods in 2014.',
    'What are the top 3 segments by total spend in fiscal year 2014-2015',
  ];

  /** Reference to the scrollable messages container. */
  messagesContainer = viewChild<ElementRef<HTMLElement>>('messagesContainer');

  /** Whether the user has started a conversation (sent at least one message). */
  hasStarted = computed(() => this.messages().length > 0);

  /** Suggested questions for the empty state. */
  readonly suggestions: readonly string[] = [
    'How many orders were created in 2014?',
    'Which department had the highest spending?',
    'What are the most frequently ordered items?',
    'Show me IT Goods purchases.',
  ];

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      const prefersDark =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = saved ? saved === 'dark' : prefersDark;
      this.isDarkMode.set(isDark);
      this.applyTheme(isDark);
    }
  }

  toggleTheme(): void {
    const nextDark = !this.isDarkMode();
    this.isDarkMode.set(nextDark);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', nextDark ? 'dark' : 'light');
    }
    this.applyTheme(nextDark);
  }

  private applyTheme(isDark: boolean): void {
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark');
      }
    }
  }

  hasQueryOrPipeline(message: ChatMessage): boolean {
    return this.getFormattedDetails(message).length > 0;
  }

  getFormattedDetails(message: ChatMessage): { type: string; content: string }[] {
    const sections: { type: string; content: string }[] = [];

    const hasPipeline =
      message.pipeline &&
      ((Array.isArray(message.pipeline) && message.pipeline.length > 0) ||
        (typeof message.pipeline === 'object' &&
          Object.keys(message.pipeline).length > 0));

    const hasQuery =
      message.query &&
      ((typeof message.query === 'object' &&
        Object.keys(message.query).length > 0) ||
        (typeof message.query === 'string' &&
          message.query.trim().length > 0));

    if (hasPipeline) {
      sections.push({
        type: 'Pipeline',
        content:
          typeof message.pipeline === 'string'
            ? message.pipeline
            : JSON.stringify(message.pipeline, null, 2),
      });
    }

    if (hasQuery) {
      sections.push({
        type: 'Query',
        content:
          typeof message.query === 'string'
            ? message.query
            : JSON.stringify(message.query, null, 2),
      });
    }

    return sections;
  }

  getRawDetailsString(message: ChatMessage): string {
    const sections = this.getFormattedDetails(message);
    return sections
      .map((s) => `// ${s.type}\n${s.content}`)
      .join('\n\n');
  }

  toggleMessageDetails(index: number): void {
    this.messages.update((messages) => {
      const updated = [...messages];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          showDetails: !updated[index].showDetails,
        };
      }
      return updated;
    });

    setTimeout(() => this.scrollToBottom(), 50);
  }

  copyDetails(text: string, index: number, event: Event): void {
    event.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this.copiedIndex.set(index);
      setTimeout(() => {
        if (this.copiedIndex() === index) {
          this.copiedIndex.set(null);
        }
      }, 2000);
    }
  }

  scrollToBottom(): void {
    const container = this.messagesContainer()?.nativeElement;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      });
    }
  }

  toggleReadyQuestions(event?: Event): void {
    event?.stopPropagation();
    if (this.isLoading()) return;
    this.showReadyQuestions.update((prev) => !prev);
  }

  selectReadyQuestion(question: string): void {
    this.showReadyQuestions.set(false);
    this.inputValue.set(question);
    this.sendMessage();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showReadyQuestions()) return;
    const target = event.target as HTMLElement;
    if (
      !target.closest('.ready-questions-panel') &&
      !target.closest('.prompt-hint-button')
    ) {
      this.showReadyQuestions.set(false);
    }
  }

  selectSuggestion(question: string): void {
    this.inputValue.set(question);
    this.sendMessage();
  }

  async sendMessage() {
    const question = this.inputValue().trim();

    if (!question || this.isLoading()) return;

    this.messages.update((messages) => [
      ...messages,
      { role: 'user', content: question },
      { role: 'assistant', content: '' },
    ]);

    this.inputValue.set('');
    this.isLoading.set(true);
    this.isStreaming.set(false);

    // Scroll after adding user message
    setTimeout(() => this.scrollToBottom(), 50);

    try {
      const result = await this.chatService.sendMessage(
        question,
        (token: string) => {
          if (!this.isStreaming()) {
            this.isStreaming.set(true);
          }

          this.messages.update((messages) => {
            const updated = [...messages];
            const lastMessage = updated[updated.length - 1];

            updated[updated.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + token,
            };

            return updated;
          });

          // Scroll as tokens arrive
          this.scrollToBottom();
        },
        this.threadId() ?? undefined
      );

      this.threadId.set(result.thread_id);

      // Replace streamed content with the final answer to prevent duplication
      // and attach database query / pipeline metadata
      this.messages.update((messages) => {
        const updated = [...messages];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: result.answer || updated[lastIndex].content,
            query: result.query,
            pipeline: result.pipeline,
            showDetails: false,
          };
        }
        return updated;
      });
    } catch (error) {
      console.error('Chat request failed:', error);

      this.messages.update((messages) => {
        const updated = [...messages];

        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content:
            error instanceof Error
              ? error.message
              : 'Something went wrong. Please try again.',
        };

        return updated;
      });
    } finally {
      this.isLoading.set(false);
      this.isStreaming.set(false);
      this.scrollToBottom();
    }
  }
}
