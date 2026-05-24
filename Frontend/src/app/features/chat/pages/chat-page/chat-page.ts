import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ChatService } from '../../../../core/services/chat.service';
import { AuthService } from '../../../../core/services/auth';
import { Conversation, Message } from '../../../../core/models/message.model';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeAgoPipe, RouterLink],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css',
})
export class ChatPage implements OnInit {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  conversations: Conversation[] = [];
  activeConversation: Conversation | null = null;
  messages: Message[] = [];
  newMessage = '';
  currentUserId = '';
  isTyping = false;

  ngOnInit() {
    const user = this.authService.currentUser();
    this.currentUserId = user?.id ?? '';
    
    this.route.queryParams.subscribe(params => {
      const recipientId = params['recipientId'];
      const productId = params['productId'];
      
      if (recipientId && productId) {
        this.chatService.getConversations().subscribe({
          next: (convs) => {
            this.conversations = convs;
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
                    this.conversations = newConvs;
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
      } else {
        this.loadConversations(true);
      }
    });
  }

  loadConversations(selectFirst = false) {
    this.chatService.getConversations().subscribe({
      next: (convs) => {
        this.conversations = convs;
        if (selectFirst && convs.length > 0) {
          this.selectConversation(convs[0]);
        }
      },
      error: (err) => console.error('Error loading conversations:', err)
    });
  }

  selectConversation(conv: Conversation) {
    this.activeConversation = conv;
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
        this.messages.push(msg);
        this.newMessage = '';
        this.loadConversations(false);
      },
      error: (err) => console.error('Error sending message:', err)
    });
  }
}
