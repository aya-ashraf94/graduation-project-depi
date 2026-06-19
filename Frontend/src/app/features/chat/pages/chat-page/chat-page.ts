import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ChatService } from '../../../../core/services/chat.service';
import { AuthService } from '../../../../core/services/auth';
import { environment } from '../../../../../environments/environment';
import { Conversation, Message } from '../../../../core/models/message.model';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';

import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeAgoPipe, RouterLink, CurrencyFormatPipe],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css',
})
export class ChatPage implements OnInit {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  private socket: Socket | null = null;

  conversations = signal<Conversation[]>([]);
  activeConversation: Conversation | null = null;
  messages: Message[] = [];
  newMessage = '';
  currentUserId = '';
  searchTerm = signal('');

  filteredConversations = computed(() => {
    const convs = this.conversations();
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return convs;
    return convs.filter(c => {
      const other = c.participants.find(p => p.id !== this.currentUserId);
      const name = other ? `${other.firstName} ${other.lastName}`.toLowerCase() : '';
      const product = (c.productTitle || '').toLowerCase();
      return name.includes(term) || product.includes(term);
    });
  });

  ngOnInit() {
    const user = this.authService.currentUser();
    this.currentUserId = user?.id ?? '';

    // Initialize Socket connection
    const backendUrl = environment.apiUrl.replace('/api', '');
    this.socket = io(backendUrl);

    this.socket.on("new_message", (msg: Message) => {
      if (this.activeConversation && msg.conversationId === this.activeConversation.id) {
        if (!this.messages.some(m => m.id === msg.id)) {
          this.messages.push(msg);
          this.chatService.markAsRead(this.activeConversation.id).subscribe();
        }
      }
      this.loadConversations(false);
    });

    this.loadConversations(false);

    this.route.queryParams.subscribe(params => {
      const recipientId = params['recipientId'];
      const productId = params['productId'];

      if (recipientId && productId) {
        this.chatService.getConversations().subscribe({
          next: (convs) => {
            this.conversations.set(convs);
            const existing = convs.find(c =>
              c.productId === productId &&
              c.participants?.some(p => p.id === recipientId)
            );

            if (existing) {
              this.selectConversation(existing);
            } else {
              this.chatService.startConversation({
                recipientId,
                productId,
                initialMessage: 'Hello, I am interested in this item.'
              }).subscribe({
                next: (res) => {
                  this.chatService.getConversations().subscribe(newConvs => {
                    this.conversations.set(newConvs);
                    const newConv = newConvs.find(c => c.id === res.conversationId);
                    if (newConv) {
                      this.selectConversation(newConv);
                    } else if (newConvs.length > 0) {
                      this.selectConversation(newConvs[0]);
                    }
                  });
                },
                error: (err) => {
                  console.error('Error starting conversation:', err);
                  this.loadConversations(true);
                }
              });
            }
          },
          error: (err) => {
            console.error('Error loading conversations:', err);
            this.loadConversations(true);
          }
        });
      }
    });
  }

  loadConversations(selectFirst = false) {
    this.chatService.getConversations().subscribe({
      next: (convs) => {
        this.conversations.set(convs);
        if (selectFirst && convs.length > 0 && !this.activeConversation) {
          this.selectConversation(convs[0]);
        }
      },
      error: (err) => console.error('Error loading conversations:', err)
    });
  }

  selectConversation(conv: Conversation) {
    this.activeConversation = conv;
    
    if (this.socket) {
      this.socket.emit("join_conversation", conv.id);
    }

    this.chatService.getMessages(conv.id).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.chatService.markAsRead(conv.id).subscribe({
          next: () => {
            this.loadConversations(false);
          }
        });
      },
      error: (err) => console.error('Error loading messages:', err)
    });
  }

  send() {
    if (!this.newMessage.trim() || !this.activeConversation) return;

    const payload = {
      conversationId: this.activeConversation.id,
      content: this.newMessage
    };

    this.chatService.sendMessage(payload).subscribe({
      next: (msg) => {
        if (!this.messages.some(m => m.id === msg.id)) {
          this.messages.push(msg);
        }
        this.newMessage = '';
        this.loadConversations(false);
      },
      error: (err) => console.error('Error sending message:', err)
    });
  }

  getOtherParticipant(conv: Conversation) {
    return conv.participants.find(p => p.id !== this.currentUserId) || null;
  }
}
