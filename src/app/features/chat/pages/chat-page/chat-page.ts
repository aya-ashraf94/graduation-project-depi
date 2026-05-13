import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

  conversations: Conversation[] = [];
  activeConversation: Conversation | null = null;
  messages: Message[] = [];
  newMessage = '';
  currentUserId = '';
  isTyping = false;

  ngOnInit() {
    this.conversations = this.chatService.getConversations();
    const user = this.authService.currentUser();
    this.currentUserId = user?.id ?? '';
    if (this.conversations.length > 0) {
      this.selectConversation(this.conversations[0]);
    }
  }

  selectConversation(conv: Conversation) {
    this.activeConversation = conv;
    this.messages = this.chatService.getMessages(conv.id);
    this.chatService.markAsRead(conv.id);
    this.conversations = this.chatService.getConversations();

    // Mock realistic typing when opening conversation
    this.isTyping = true;
    setTimeout(() => {
      this.isTyping = false;
    }, 2500);
  }

  send() {
    if (!this.newMessage.trim() || !this.activeConversation) return;
    this.chatService.sendMessage(
      { conversationId: this.activeConversation.id, content: this.newMessage },
      this.currentUserId
    );
    this.messages = this.chatService.getMessages(this.activeConversation.id);
    this.newMessage = '';

    // Mock realistic reply typing
    this.isTyping = true;
    setTimeout(() => {
      this.isTyping = false;
    }, 3000);
  }
}
