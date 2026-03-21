import {
  pgTable,
  text,
  uuid,
  bigint,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const books = pgTable(
  "books",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    title: text("title").notNull(),
    author: text("author"),
    filename: text("filename").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    storagePath: text("storage_path").notNull().unique(),
    coverPath: text("cover_path"),
    numPages: integer("num_pages"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_books_user").on(table.clerkUserId),
    index("idx_books_updated").on(table.clerkUserId, table.updatedAt),
  ]
);

export const annotations = pgTable(
  "annotations",
  {
    id: text("id").notNull(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    type: text("type").notNull(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.bookId] }),
    index("idx_annotations_book").on(table.bookId),
  ]
);

export const canvasContent = pgTable("canvas_content", {
  bookId: uuid("book_id")
    .primaryKey()
    .references(() => books.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id").notNull(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    quotedText: text("quoted_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.bookId] }),
    index("idx_chat_messages_book").on(table.bookId, table.createdAt),
  ]
);

export const readingProgress = pgTable("reading_progress", {
  bookId: uuid("book_id")
    .primaryKey()
    .references(() => books.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull(),
  currentPage: integer("current_page").notNull().default(1),
  furthestPage: integer("furthest_page").notNull().default(1),
  lastPageRead: integer("last_page_read").notNull().default(1),
  scale: numeric("scale", { precision: 4, scale: 2 }).default("1.5"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  activeTab: text("active_tab").default("chat"),
  isPanelCollapsed: boolean("is_panel_collapsed").default(false),
  sidebarWidth: integer("sidebar_width").default(384),
  theme: text("theme").default("light"),
  chatInstructions: text("chat_instructions"),
  llmProvider: text("llm_provider"),
  llmModel: text("llm_model"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
