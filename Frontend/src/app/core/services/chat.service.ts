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

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(this.apiUrl);
  }

  getMessages(conversationId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/${conversationId}/messages`);
  }

  sendMessage(payload: SendMessageRequest): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/messages`, payload);
  }

  startConversation(payload: StartConversationRequest): Observable<{ conversationId: string }> {
    return this.http.post<{ conversationId: string }>(this.apiUrl, payload);
  }

  markAsRead(conversationId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${conversationId}/read`, {});
  }
}
