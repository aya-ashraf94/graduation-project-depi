import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Conversation,
  Message,
  SendMessageRequest,
  StartConversationRequest,
} from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/conversations`;

  /** GET CONVERSATIONS for the current user */
  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(this.apiUrl);
  }

  /** GET MESSAGES for a conversation */
  getMessages(conversationId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/${conversationId}/messages`);
  }

  /** SEND A MESSAGE */
  sendMessage(payload: SendMessageRequest): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/messages`, payload);
  }

  /** START A NEW CONVERSATION */
  startConversation(payload: StartConversationRequest): Observable<{ conversationId: string }> {
    return this.http.post<{ conversationId: string }>(this.apiUrl, payload);
  }

  /** Mark all messages in a conversation as read */
  markAsRead(conversationId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${conversationId}/read`, {});
  }
}
