const { pgTable, uuid, text, integer, boolean, timestamp, jsonb, doublePrecision, primaryKey, index } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role', { enum: ['user', 'admin'] }).default('user').notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  isSuspended: boolean('is_suspended').default(false).notNull(),
  avatar: text('avatar').default('').notNull(),
  bio: text('bio').default('').notNull(),
  phoneNumber: text('phone_number').default('').notNull(),
  location: text('location').default('').notNull(),
  governorate: text('governorate').default('').notNull(),
  city: text('city').default('').notNull(),
  district: text('district').default('').notNull(),
  tierId: uuid('tier_id').references(() => sellerTiers.id, { onDelete: 'set null' }),
  tierExpiresAt: timestamp('tier_expires_at', { mode: 'date' }),
  autoRenew: boolean('auto_renew').default(false).notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  tags: text('tags').array().default([]).notNull(),
  trustBadge: text('trust_badge'),
  rating: doublePrecision('rating').default(5.0).notNull(),
  totalSales: integer('total_sales').default(0).notNull(),
  totalPurchases: integer('total_purchases').default(0).notNull(),
  successRate: doublePrecision('success_rate').default(100).notNull(),
  balance: doublePrecision('balance').default(0.0).notNull(),
  resetPasswordToken: text('reset_password_token'),
  resetPasswordExpires: timestamp('reset_password_expires', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  discountPercent: doublePrecision('discount_percent'),
  saleStart: timestamp('sale_start', { mode: 'date' }),
  saleEnd: timestamp('sale_end', { mode: 'date' }),
});

const categoryAttributes = pgTable('category_attributes', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ['select', 'radio', 'text'] }).notNull(),
  options: text('options').array(),
  required: boolean('required').default(true).notNull(),
  hasOther: boolean('has_other').default(false).notNull(),
}, (table) => ({
  catAttrIdx: index('cat_attr_category_idx').on(table.categoryId),
}));

const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  price: doublePrecision('price').notNull(),
  minPrice: doublePrecision('min_price'),
  images: text('images').array().default([]).notNull(),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  dynamicAttributes: jsonb('dynamic_attributes').default({}).notNull(),
  showContactInfo: boolean('show_contact_info').default(true).notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  soldByNafa3ni: boolean('sold_by_nafa3ni').default(false).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  status: text('status', { enum: ['active', 'reserved', 'sold', 'draft'] }).default('active').notNull(),
  reservedAt: timestamp('reserved_at', { mode: 'date' }),
  reservedBy: uuid('reserved_by'),
  viewCount: integer('view_count').default(0).notNull(),
  favoriteCount: integer('favorite_count').default(0).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index('product_category_idx').on(table.categoryId),
  userIdx: index('product_user_idx').on(table.userId),
  createdAtIdx: index('product_created_at_idx').on(table.createdAt),
  statusIdx: index('product_status_idx').on(table.status),
  reservedAtIdx: index('product_reserved_at_idx').on(table.reservedAt),
}));

const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  buyerId: uuid('buyer_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  price: doublePrecision('price').notNull(),
  originalPrice: doublePrecision('original_price'),
  flashSaleDiscount: doublePrecision('flash_sale_discount').default(0),
  categorySaleDiscount: doublePrecision('category_sale_discount').default(0),
  couponDiscount: doublePrecision('coupon_discount').default(0),
  offerAmount: doublePrecision('offer_amount'),
  platformFee: doublePrecision('platform_fee').default(0).notNull(),
  status: text('status', { enum: ['pending', 'shipped', 'delivered', 'cancelled'] }).default('pending').notNull(),
  paymentMethod: text('payment_method').notNull(),
  shippingAddress: text('shipping_address').notNull(),
  notes: text('notes'),
  trackingNumber: text('tracking_number'),
  couponCode: text('coupon_code'),
  offerId: uuid('offer_id').references(() => offers.id, { onDelete: 'set null' }),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  orderProductIdx: index('order_product_idx').on(table.productId),
  orderBuyerIdx: index('order_buyer_idx').on(table.buyerId),
  orderSellerIdx: index('order_seller_idx').on(table.sellerId),
  orderBuyerCreatedAtIdx: index('order_buyer_created_at_idx').on(table.buyerId, table.createdAt),
  orderSellerCreatedAtIdx: index('order_seller_created_at_idx').on(table.sellerId, table.createdAt),
  orderBuyerCouponIdx: index('order_buyer_coupon_idx').on(table.buyerId, table.couponCode),
  orderStatusIdx: index('order_status_idx').on(table.status),
  orderStripePiIdx: index('order_stripe_pi_idx').on(table.stripePaymentIntentId),
}));

const reviews = pgTable('reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  reviewerId: uuid('reviewer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  revieweeId: uuid('reviewee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  reviewOrderIdx: index('review_order_idx').on(table.orderId),
  reviewReviewerIdx: index('review_reviewer_idx').on(table.reviewerId),
  reviewRevieweeIdx: index('review_reviewee_idx').on(table.revieweeId),
  reviewProductIdx: index('review_product_idx').on(table.productId),
}));

const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  lastMessageId: uuid('last_message_id').references(() => messages.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  convProductIdx: index('conv_product_idx').on(table.productId),
}));

const conversationParticipants = pgTable('conversation_participants', {
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.conversationId, table.userId] }),
  participantUserIdx: index('participant_user_idx').on(table.userId),
}));

const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  status: text('status', { enum: ['sent', 'delivered', 'read'] }).default('sent').notNull(),
  type: text('type', { enum: ['text', 'offer', 'system', 'counter_offer'] }).default('text').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  msgConvIdx: index('msg_conversation_idx').on(table.conversationId),
  msgSenderIdx: index('msg_sender_idx').on(table.senderId),
}));

const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['order_update', 'review', 'message', 'system', 'report', 'refund'] }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  linkedEntityId: text('linked_entity_id').default('').notNull(),
  linkedRoute: text('linked_route').default('').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  userNotifIdx: index('notif_user_idx').on(table.userId, table.createdAt),
  notifUserReadIdx: index('notif_user_read_idx').on(table.userId, table.isRead),
}));

const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  reporterId: uuid('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  details: text('details'),
  status: text('status', { enum: ['pending', 'resolved', 'dismissed'] }).default('pending').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  reportProductIdx: index('report_product_idx').on(table.productId),
  reportReporterIdx: index('report_reporter_idx').on(table.reporterId),
  reportStatusIdx: index('report_status_idx').on(table.status),
}));

const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

const newsletters = pgTable('newsletters', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

const userWishlist = pgTable('user_wishlist', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.productId] }),
  wishlistProductIdx: index('wishlist_product_idx').on(table.productId),
}));

const offers = pgTable('offers', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  buyerId: uuid('buyer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: doublePrecision('amount').notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'rejected', 'countered', 'expired'] }).default('pending').notNull(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { mode: 'date' }),
  counterAmount: doublePrecision('counter_amount'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  offerProductIdx: index('offer_product_idx').on(table.productId),
  offerBuyerIdx: index('offer_buyer_idx').on(table.buyerId),
  offerSellerIdx: index('offer_seller_idx').on(table.sellerId),
  offerStatusExpiresIdx: index('offer_status_expires_idx').on(table.status, table.expiresAt),
}));

const follows = pgTable('follows', {
  followerId: uuid('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: uuid('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.followerId, table.followingId] }),
  followerIdx: index('follower_idx').on(table.followerId),
  followingIdx: index('following_idx').on(table.followingId),
}));

const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

const coupons = pgTable('coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  discountType: text('discount_type', { enum: ['percentage', 'fixed'] }).default('percentage').notNull(),
  discountValue: doublePrecision('discount_value').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  expiryDate: timestamp('expiry_date', { mode: 'date' }),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').default(0).notNull(),
  maxPerUser: integer('max_per_user'),
  minimumOrderValue: doublePrecision('minimum_order_value'),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

const flashSales = pgTable('flash_sales', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  discountPercent: doublePrecision('discount_percent').notNull(),
  scopeType: text('scope_type', { enum: ['all', 'category', 'product'] }).default('all').notNull(),
  scopeId: uuid('scope_id'),
  startDate: timestamp('start_date', { mode: 'date' }).notNull(),
  endDate: timestamp('end_date', { mode: 'date' }).notNull(),
  notifyBeforeMinutes: integer('notify_before_minutes').default(30).notNull(),
  notificationSent: boolean('notification_sent').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  flashActiveDatesIdx: index('flash_active_dates_idx').on(table.isActive, table.startDate, table.endDate),
}));

const userBlocks = pgTable('user_blocks', {
  blockerId: uuid('blocker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedId: uuid('blocked_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.blockerId, table.blockedId] }),
  blockerIdx: index('blocker_idx').on(table.blockerId),
  blockedIdx: index('blocked_idx').on(table.blockedId),
}));

const payouts = pgTable('payouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: doublePrecision('amount').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).default('pending').notNull(),
  paymentMethod: text('payment_method').notNull(),
  paymentDetails: text('payment_details').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  payoutSellerIdx: index('payout_seller_idx').on(table.sellerId),
  payoutStatusCreatedIdx: index('payout_status_created_idx').on(table.status, table.createdAt),
}));

const refundRequests = pgTable('refund_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),
  buyerId: uuid('buyer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  details: text('details'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).default('pending').notNull(),
  resolution: text('resolution'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  refundOrderIdx: index('refund_order_idx').on(table.orderId),
  refundBuyerIdx: index('refund_buyer_idx').on(table.buyerId),
}));

const featuredListings = pgTable('featured_listings', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sellerId: uuid('seller_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  duration: integer('duration').notNull(),
  amountPaid: doublePrecision('amount_paid').notNull(),
  startDate: timestamp('start_date', { mode: 'date' }).defaultNow().notNull(),
  endDate: timestamp('end_date', { mode: 'date' }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  featuredProductIdx: index('featured_product_idx').on(table.productId),
  featuredSellerIdx: index('featured_seller_idx').on(table.sellerId),
  featuredActiveIdx: index('featured_active_idx').on(table.isActive, table.endDate),
}));

const subscriptionTransactions = pgTable('subscription_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tierId: uuid('tier_id').notNull().references(() => sellerTiers.id, { onDelete: 'set null' }),
  amount: doublePrecision('amount').notNull(),
  billingCycle: text('billing_cycle').notNull(),
  status: text('status').default('completed').notNull(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  tierName: text('tier_name').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  subTxUserIdx: index('sub_tx_user_idx').on(table.userId),
}));

const sellerTiers = pgTable('seller_tiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  feePercent: doublePrecision('fee_percent'),
  monthlyPrice: doublePrecision('monthly_price').default(0).notNull(),
  yearlyPrice: doublePrecision('yearly_price').default(0).notNull(),
  featuredListingsIncluded: integer('featured_listings_included').default(0).notNull(),
  freeFeaturedDuration: integer('free_featured_duration').default(7),
  monthlyPromotionCredits: doublePrecision('monthly_promotion_credits').default(0),
  badgeLabel: text('badge_label'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  revoked: boolean('revoked').default(false).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({
  refreshTokenUserIdx: index('refresh_token_user_idx').on(table.userId),
  refreshTokenHashIdx: index('refresh_token_hash_idx').on(table.tokenHash),
}));

module.exports = {
  users,
  categories,
  categoryAttributes,
  products,
  orders,
  reviews,
  conversations,
  conversationParticipants,
  messages,
  notifications,
  reports,
  contacts,
  newsletters,
  userWishlist,
  offers,
  follows,
  settings,
  coupons,
  flashSales,
  userBlocks,
  payouts,
  refundRequests,
  featuredListings,
  sellerTiers,
  subscriptionTransactions,
  refreshTokens,
};
