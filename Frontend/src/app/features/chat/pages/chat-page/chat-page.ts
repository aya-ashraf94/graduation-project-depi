import { Component, OnInit, OnDestroy, AfterViewChecked, inject, signal, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../../../core/services/chat.service';
import { AuthService } from '../../../../core/services/auth';
import { OfferService } from '../../../../core/services/offer.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { environment } from '../../../../../environments/environment';
import { Conversation, Message } from '../../../../core/models/message.model';
import { Offer } from '../../../../core/models/offer.model';
import { TimeAgoPipe } from '../../../../shared/pipes/time-ago.pipe';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductService } from '../../../../core/services/product.service';
import { ReportModal } from '../../../../shared/components/report-modal/report-modal';

import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeAgoPipe, RouterLink, CurrencyFormatPipe, ReportModal],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css',
})
export class ChatPage implements OnInit, OnDestroy, AfterViewChecked {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private offerService = inject(OfferService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private confirmService = inject(ConfirmService);
  private notificationService = inject(NotificationService);
  private productService = inject(ProductService);

  private socket: Socket | null = null;
  private previousMessagesLength = 0;
  countdownTimers = signal<Record<string, string>>({});
  private countdownIntervalId: any = null;

  @ViewChild('messagesEnd') private messagesEnd!: ElementRef;

  conversations = signal<Conversation[]>([]);
  activeConversation: Conversation | null = null;
  messages: Message[] = [];
  newMessage = '';
  currentUserId = '';
  searchTerm = signal('');
  onlineUserIds = signal<Set<string>>(new Set());

  // Offer panel signals
  showOfferPanel = signal(false);
  offerAmountInput = signal(0);
  isSendingOffer = signal(false);
  isSendingMessage = signal(false);
  showOptionsMenu = signal(false);
  counteringOfferId = signal<string | null>(null);
  counterOfferAmount = signal<number>(0);

  // Report modal signals
  showReportModal = signal(false);

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

  isOwnerOfProduct = computed(() => {
    if (!this.activeConversation) return false;
    return this.activeConversation.productOwnerId === this.currentUserId;
  });

  ngOnInit() {
    const user = this.authService.currentUser();
    this.currentUserId = user?.id ?? '';

    // Initialize Socket connection with JWT token
    const token = this.authService.token();
    const backendUrl = environment.apiUrl.replace('/api', '');
    this.socket = io(backendUrl, {
      auth: { token }
    });

    this.socket.on("initial_online_users", (userIds: string[]) => {
      this.onlineUserIds.set(new Set(userIds));
    });

    this.socket.on("user_status_changed", (data: { userId: string, status: 'online' | 'offline' }) => {
      const current = new Set(this.onlineUserIds());
      if (data.status === 'online') {
        current.add(data.userId);
      } else {
        current.delete(data.userId);
      }
      this.onlineUserIds.set(current);
    });

    this.socket.on("new_message", (msg: Message) => {
      if (this.activeConversation && msg.conversationId === this.activeConversation.id) {
        if (!this.messages.some(m => m.id === msg.id)) {
          this.messages.push(msg);
          this.chatService.markAsRead(this.activeConversation.id).subscribe({
            next: () => this.notificationService.fetchNotifications()
          });
          this.startCountdownTimer();
        }
      }
      this.loadConversations(false);
    });

    this.socket.on("offer_status_changed", (updatedOffer: Offer) => {
      // Find the message that references this offer and update its status
      this.messages = this.messages.map(m => {
        if (m.metadata && m.metadata.offerId === updatedOffer.id) {
          return {
            ...m,
            metadata: {
              ...m.metadata,
              offerStatus: updatedOffer.status,
              counterAmount: updatedOffer.counterAmount
            }
          };
        }
        return m;
      });
      this.startCountdownTimer();
      this.loadConversations(false);
    });

    this.socket.on("offer_accepted_checkout", (data: {
      offerId: string;
      productId: string;
      finalAmount: number;
    }) => {
      // Buyer automatically navigates to checkout URL
      if (this.activeConversation && this.activeConversation.productOwnerId !== this.currentUserId) {
        this.router.navigate(['/products', data.productId], {
          queryParams: { buyNow: 'true', offerId: data.offerId }
        });
      }
    });

    this.loadConversations(false);

    this.route.queryParams.subscribe(params => {
      const recipientId = params['recipientId'];
      const productId = params['productId'];
      const conversationId = params['conversationId'];

      if (conversationId) {
        this.chatService.getConversations().subscribe({
          next: (convs) => {
            this.conversations.set(convs);
            const found = convs.find(c => c.id === conversationId);
            if (found) {
              this.selectConversation(found);
            }
          },
          error: (err) => {
            console.error('Error loading conversations:', err);
            this.loadConversations(true);
          }
        });
      } else if (recipientId && productId) {
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

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
    }
  }

  ngAfterViewChecked() {
    if (this.messages.length !== this.previousMessagesLength) {
      this.previousMessagesLength = this.messages.length;
      this.scrollToBottom();
    }
  }

  scrollToBottom(): void {
    try {
      this.messagesEnd.nativeElement.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {}
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
    this.previousMessagesLength = 0;
    this.showOfferPanel.set(false);
    
    if (this.socket) {
      this.socket.emit("join_conversation", conv.id);
    }

    this.chatService.getMessages(conv.id).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.startCountdownTimer();
        this.chatService.markAsRead(conv.id).subscribe({
          next: () => {
            this.loadConversations(false);
            this.notificationService.fetchNotifications();
          }
        });
      },
      error: (err) => console.error('Error loading messages:', err)
    });
  }

  startCountdownTimer() {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    
    const updateTimers = () => {
      const timers: Record<string, string> = {};
      let hasActive = false;
      
      this.messages.forEach(msg => {
        const offerId = msg.metadata?.offerId;
        if (offerId && msg.metadata?.offerStatus === 'accepted' && msg.metadata?.expiresAt) {
          const expiresAt = new Date(msg.metadata.expiresAt).getTime();
          const now = Date.now();
          const diff = expiresAt - now;
          
          if (diff > 0) {
            hasActive = true;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            const hh = String(hours).padStart(2, '0');
            const mm = String(minutes).padStart(2, '0');
            const ss = String(seconds).padStart(2, '0');
            timers[offerId] = `${hh}:${mm}:${ss}`;
          } else {
            timers[offerId] = 'Expired';
          }
        }
      });
      
      this.countdownTimers.set(timers);
      if (!hasActive && this.countdownIntervalId) {
        clearInterval(this.countdownIntervalId);
        this.countdownIntervalId = null;
      }
    };
    
    updateTimers();
    this.countdownIntervalId = setInterval(updateTimers, 1000);
  }

  getCountdownTime(offerId: string | undefined): string {
    if (!offerId) return '02:00:00';
    return this.countdownTimers()[offerId] || '02:00:00';
  }

  isLatestAcceptedOffer(offerId: string | undefined): boolean {
    if (!offerId) return false;
    const acceptedMsgs = this.messages.filter(m => 
      (m.type === 'offer' || m.type === 'counter_offer') && 
      m.metadata?.offerStatus === 'accepted' && 
      m.metadata?.offerId
    );
    if (acceptedMsgs.length === 0) return false;
    const latestMsg = acceptedMsgs[acceptedMsgs.length - 1];
    return latestMsg.metadata?.offerId === offerId;
  }

  isUserOnline(userId: string | undefined): boolean {
    if (!userId) return false;
    return this.onlineUserIds().has(userId);
  }

  send() {
    if (!this.newMessage.trim() || !this.activeConversation || this.isSendingMessage()) return;

    this.isSendingMessage.set(true);

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
        this.isSendingMessage.set(false);
        this.loadConversations(false);
      },
      error: (err) => {
        console.error('Error sending message:', err);
        this.isSendingMessage.set(false);
      }
    });
  }

  // --- Offer Actions ---

  openOfferPanel() {
    this.offerAmountInput.set(this.activeConversation?.productPrice || 0);
    this.showOfferPanel.set(true);
  }

  closeOfferPanel() {
    this.showOfferPanel.set(false);
  }

  submitOffer() {
    if (!this.activeConversation || !this.activeConversation.productId || this.offerAmountInput() <= 0) return;
    this.isSendingOffer.set(true);

    this.offerService.makeOffer({
      productId: this.activeConversation.productId,
      amount: this.offerAmountInput(),
      conversationId: this.activeConversation.id
    }).subscribe({
      next: (res) => {
        this.closeOfferPanel();
        this.isSendingOffer.set(false);
      },
      error: (err) => {
        console.error('Error submitting offer:', err);
        this.isSendingOffer.set(false);
      }
    });
  }

  acceptOffer(offerId: string | undefined) {
    if (!offerId) return;
    this.offerService.acceptOffer(offerId).subscribe({
      next: (updatedOffer) => {
        // Socket will push system message and trigger checkout navigate
      },
      error: (err) => console.error('Error accepting offer:', err)
    });
  }

  rejectOffer(offerId: string | undefined) {
    if (!offerId) return;
    this.offerService.rejectOffer(offerId).subscribe({
      error: (err) => console.error('Error rejecting offer:', err)
    });
  }

  startCounterOffer(offerId: string | undefined) {
    if (!offerId) return;
    this.counteringOfferId.set(offerId);
    this.counterOfferAmount.set(0);
  }

  cancelCounterOffer() {
    this.counteringOfferId.set(null);
    this.counterOfferAmount.set(0);
  }

  submitCounterOffer(offerId: string | undefined) {
    if (!offerId) return;
    const amount = this.counterOfferAmount();
    if (amount <= 0 || isNaN(amount)) return;
    this.offerService.counterOffer(offerId, amount).subscribe({
      next: () => {
        this.cancelCounterOffer();
      },
      error: (err) => console.error('Error countering offer:', err)
    });
  }

  getOtherParticipant(conv: Conversation) {
    return conv.participants.find(p => p.id !== this.currentUserId) || null;
  }

  deleteChat(conversationId: string, event: Event) {
    event.stopPropagation();
    this.confirmService.show({
      title: 'Delete Chat',
      message: 'Are you sure you want to delete this conversation? This action cannot be undone.',
      onConfirm: () => {
        this.chatService.deleteConversation(conversationId).subscribe({
          next: () => {
            this.conversations.set(this.conversations().filter(c => c.id !== conversationId));
            if (this.activeConversation && this.activeConversation.id === conversationId) {
              this.activeConversation = null;
              this.messages = [];
            }
          },
          error: (err) => console.error('Error deleting conversation:', err)
        });
      }
    });
  }

  toggleOptionsMenu(event: Event) {
    event.stopPropagation();
    this.showOptionsMenu.set(!this.showOptionsMenu());
  }

  triggerDeleteChat(event: Event) {
    if (this.activeConversation) {
      this.deleteChat(this.activeConversation.id, event);
    }
    this.showOptionsMenu.set(false);
  }

  viewUserProfile() {
    const other = this.getOtherParticipant(this.activeConversation!);
    if (other) {
      this.router.navigate(['/profile', other.id]);
    }
    this.showOptionsMenu.set(false);
  }

  blockUser(event: Event) {
    event.stopPropagation();
    const other = this.getOtherParticipant(this.activeConversation!);
    if (!other) return;
    this.confirmService.show({
      title: 'Block User',
      message: `Are you sure you want to block ${other.firstName} ${other.lastName}? You will no longer receive messages from them.`,
      onConfirm: () => {
        this.showOptionsMenu.set(false);
        this.confirmService.show({
          title: 'User Blocked',
          message: `${other.firstName} ${other.lastName} has been blocked successfully.`,
          onConfirm: () => {}
        });
      }
    });
  }

  openReport(event?: Event) {
    if (event) event.stopPropagation();
    this.showReportModal.set(true);
    this.showOptionsMenu.set(false);
  }

  closeReport() {
    this.showReportModal.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.btn-options') && !target.closest('.options-dropdown')) {
      this.showOptionsMenu.set(false);
    }
  }
}
